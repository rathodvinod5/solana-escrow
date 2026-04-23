use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken, 
    token::{ Mint, Token, TokenAccount }
};

use crate::{errors::EscrowError, states::EscrowOffer};

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct TakeOffer<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

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