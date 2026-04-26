use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken, 
    token::{ CloseAccount, Mint, Token, TokenAccount, TransferChecked, close_account, transfer_checked }
};

use crate::{errors::EscrowError, states::EscrowOffer};


pub fn take_offer(ctx: Context<TakeOffer>, id: u64) -> Result<()> {
    let taker = &ctx.accounts.taker;
    let maker = &ctx.accounts.maker;
    let token_mint_a = &ctx.accounts.token_mint_a;
    let token_mint_b = &ctx.accounts.token_mint_b;
    let escrow_offer = &ctx.accounts.escrow_offer;
    let vault = &ctx.accounts.vault;
    let taker_ata_for_token_a = &ctx.accounts.taker_ata_for_token_a;
    let taker_ata_for_token_b = &ctx.accounts.taker_ata_for_token_b;
    let maker_ata_for_token_b = &ctx.accounts.maker_ata_for_token_b;
    let token_program = &ctx.accounts.token_program;

    // 1. transfer token_a from vault to taker
    let signer_seeds: [&[&[u8]]; 1] = [&[
        b"offer",
        maker.to_account_info().key.as_ref(),
        &id.to_le_bytes(),
        &[escrow_offer.bump],
    ]];
    let cpi_accounts_for_vault_to_taker = TransferChecked {
        from: vault.to_account_info(),
        to: taker_ata_for_token_a.to_account_info(),
        mint: token_mint_a.to_account_info(),
        authority: escrow_offer.to_account_info(),
    };
    let cpi_context_for_vault_to_taker = CpiContext::new_with_signer(
        token_program.to_account_info(), 
        cpi_accounts_for_vault_to_taker, 
        &signer_seeds
    );
    let _ = transfer_checked(
        cpi_context_for_vault_to_taker, 
        vault.amount, 
        token_mint_a.decimals
    )?;

    // 2. transfer token_b from taker to maker
    let cpi_accounts_for_taker_to_maker = TransferChecked {
        from: taker_ata_for_token_b.to_account_info(),
        to: maker_ata_for_token_b.to_account_info(),
        mint: token_mint_b.to_account_info(),
        authority: taker.to_account_info()
    };
    let cpi_context_for_taker_to_maker = CpiContext::new(
        token_program.to_account_info(), 
        cpi_accounts_for_taker_to_maker
    );
    let _ = transfer_checked(
        cpi_context_for_taker_to_maker, 
        escrow_offer.token_b_requested_amount, 
        token_mint_b.decimals
    )?;

    // 3. close vault account
    let cpi_accounts_for_close_escrow = CloseAccount {
        account: vault.to_account_info(),
        destination: escrow_offer.to_account_info(),
        authority: maker.to_account_info(),
    };
    let cpi_context_for_close_escrow = CpiContext::new_with_signer(
        token_program.to_account_info(), 
        cpi_accounts_for_close_escrow, 
        &signer_seeds
    );
    let _ = close_account(cpi_context_for_close_escrow)?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct TakeOffer<'info> {
    /// CHECK: taker who accepts the offer for getting token_a from token_b
    #[account(mut)]
    pub taker: Signer<'info>,

    /// CHECK: maker who initiated the offer for token swap
    #[account(mut)]
    pub maker: AccountInfo<'info>,

    #[account(mut)]
    pub token_mint_a: Account<'info, Mint>,

    #[account(mut)]
    pub token_mint_b: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = taker,
        associated_token::token_program = token_program
    )]
    pub taker_ata_for_token_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint_b,
        associated_token::authority = token_mint_b,
        associated_token::token_program = token_program
    )]
    pub taker_ata_for_token_b: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint_b,
        associated_token::authority = maker,
        associated_token::token_program = token_program
    )]
    pub maker_ata_for_token_b: Account<'info, TokenAccount>,

    #[account(
        mut,
        close = maker,
        has_one = token_mint_a @ EscrowError::InvalidTokenMintA,
        has_one = token_mint_b @ EscrowError::InvalidTokenMintA,
        has_one = maker @ EscrowError::InvalidMaker,
        seeds = [b"offer", maker.key().as_ref(), &id.to_le_bytes()],
        bump = escrow_offer.bump
    )]
    pub escrow_offer: Account<'info, EscrowOffer>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = escrow_offer,
        associated_token::token_program = token_program
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>
}