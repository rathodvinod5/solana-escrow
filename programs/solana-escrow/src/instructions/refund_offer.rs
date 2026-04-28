use anchor_lang::prelude::*;

use anchor_spl::{
    associated_token::AssociatedToken, 
    token::{ CloseAccount, Mint, Token, TokenAccount, TransferChecked, close_account, transfer_checked }
};

use crate::{errors::EscrowError, states::EscrowOffer};

pub fn refund_offer(ctx: Context<RefundOffer>, id: u64) -> Result<()> {
    let maker = &ctx.accounts.maker;
    let token_mint_a = &ctx.accounts.token_mint_a;
    let maker_ata_for_token_a = &ctx.accounts.maker_ata_for_token_a;
    let vault = &ctx.accounts.vault;
    let escrow_offer = &ctx.accounts.escrow_offer;
    let token_program = &ctx.accounts.token_program;

    require_gt!(vault.amount, 0, EscrowError::InvalidAmount);

    let signer_seeds: [&[&[u8]]; 1] = [&[
        b"offer",
        maker.to_account_info().key.as_ref(),
        &id.to_le_bytes(), 
        &[escrow_offer.bump],
    ]];

    // 1. Transfer tokens from vault to maker ata
    let cpi_context_for_vault_to_maker = TransferChecked {
        from: vault.to_account_info(),
        to: maker_ata_for_token_a.to_account_info(),
        mint: token_mint_a.to_account_info(),
        authority: escrow_offer.to_account_info(),
    };
    let cpi_context_for_vault_to_maker = CpiContext::new_with_signer(
        token_program.to_account_info(), 
        cpi_context_for_vault_to_maker, 
        &signer_seeds
    );
    let _ = transfer_checked(
        cpi_context_for_vault_to_maker, 
        vault.amount, 
        token_mint_a.decimals
    )?;

    // 2. Close vault account
    let cpi_account_to_close_vault = CloseAccount {
        account: vault.to_account_info(),
        authority: escrow_offer.to_account_info(),
        destination: maker.to_account_info()
    };
    let cpi_context_to_close_escrow_offer = CpiContext::new_with_signer(
        token_program.to_account_info(), 
        cpi_account_to_close_vault, 
        &signer_seeds
    );
    let _ = close_account(cpi_context_to_close_escrow_offer)?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct RefundOffer<'info> {
    /// CHECK: maker who refunds it's token back from vault to it's ata
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(mut)]
    pub token_mint_a: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = maker,
        associated_token::token_program = token_program
    )]
    pub maker_ata_for_token_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = escrow_offer,
        associated_token::token_program = token_program
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        close = maker,
        has_one = maker @ EscrowError::InvalidMaker,
        has_one = token_mint_a @ EscrowError::InvalidTokenMintA,
        seeds = [b"offer", maker.key().as_ref(), &id.to_le_bytes()],
        bump = escrow_offer.bump
    )]
    pub escrow_offer: Account<'info, EscrowOffer>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>
}