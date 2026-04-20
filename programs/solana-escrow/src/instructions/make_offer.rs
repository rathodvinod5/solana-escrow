use anchor_lang::prelude::*;

use crate::states::EscrowOffer;

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