use anchor_lang::prelude::*;

use crate::states::EscrowOffer;
use crate::errors::EscrowError;

pub fn make_offer(
    ctx: Context<MakeOffer>, 
    id: u64, 
    token_a_transfer_amount: u64,
    token_b_requested_amount: u64
) -> Result<()> {
    let maker = &ctx.accounts.maker;
    let token_mint_a = &ctx.account.token_mint_a;
    let token_mint_b = &ctx.account.token_mint_b;
    let escrow_offer = &mut ctx.accounts.escrow_offer;
    let vaut = &ctx.accounts.vault;

    require_gt!(token_a_transfer_amount, 0, EscrowError::InvalidAmount);
    require_gt!(token_b_requested_amount, 0, EscrowError::InvalidAmount);


    escrow_offer.set_inner(EscrowOffer {
        id,
        maker: maker.key(),
        token_mint_a: token_mint_a.key(),
        token_mint_b: token_mint_b.key(),
        token_b_requested_amount: token_b_requested_amount,
        bump: escrow_offer.bump
    });

    Ok(())
}

#[derive(Accounts)]
pub struct MakeOffer<'info> {
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
        seeds = [b"offer", maker.key().as_ref(), id.to_le_bytes()],
        bump
    )]
    pub escrow_offer: Account<'info, EscrowOffer>,

    #[accout(
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