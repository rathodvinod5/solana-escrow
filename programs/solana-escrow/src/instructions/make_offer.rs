use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{ Mint, Token, TokenAccount, TransferChecked, transfer_checked };
// use anchor_spl::token_interface::{
//     transfer_checked, Mint, TokenAccount, TokenInterface,
//     TransferChecked,
// };

use crate::states::EscrowOffer;
use crate::errors::EscrowError;

pub fn make_offer(
    ctx: Context<MakeOffer>, 
    id: u64, 
    token_a_transfer_amount: u64,
    token_b_requested_amount: u64
) -> Result<()> {
    let maker = &ctx.accounts.maker;
    let token_mint_a = &ctx.accounts.token_mint_a;
    let token_mint_b = &ctx.accounts.token_mint_b;
    let escrow_offer = &mut ctx.accounts.escrow_offer;
    let vault = &ctx.accounts.vault;
    let token_program = &ctx.accounts.token_program;

    require_gt!(token_a_transfer_amount, 0, EscrowError::InvalidAmount);
    require_gt!(token_b_requested_amount, 0, EscrowError::InvalidAmount);

    let escrow_bump = ctx.bumps.escrow_offer;

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.maker_ata_for_token_mint_a.to_account_info(),
        to: vault.to_account_info(),
        mint: token_mint_a.to_account_info(),
        authority: maker.to_account_info()
    };
    let cpi_context = CpiContext::new(token_program.to_account_info(), cpi_accounts);
    let _ = transfer_checked(cpi_context, token_a_transfer_amount, token_mint_a.decimals)?;

    escrow_offer.set_inner(EscrowOffer {
        id,
        maker: maker.key(),
        token_mint_a: token_mint_a.key(),
        token_mint_b: token_mint_b.key(),
        token_b_requested_amount: token_b_requested_amount,
        bump: escrow_bump
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct MakeOffer<'info> {
    /// CHECK: maker who creates an offer for swaping token_a with token_b
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(mut)]
    pub token_mint_a: Account<'info, Mint>,

    #[account(mut)]
    pub token_mint_b: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = maker,
        associated_token::token_program = token_program
    )]
    pub maker_ata_for_token_mint_a: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = maker,
        space = 8 + EscrowOffer::INIT_SPACE,
        seeds = [b"offer", maker.key().as_ref(), &id.to_le_bytes()],
        bump
    )]
    pub escrow_offer: Account<'info, EscrowOffer>,

    #[account(
        init,
        payer = maker,
        associated_token::mint = token_mint_a,
        associated_token::authority = escrow_offer,
        associated_token::token_program = token_program,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>
}