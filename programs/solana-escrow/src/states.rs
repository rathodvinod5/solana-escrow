use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct EscrowOffer {
    id: u64,
    maker: Pubkey,
    token_mint_a: Pubkey,
    token_mint_b: Pubkey,
    token_b_requested_amount: u64,
    bump: u8
}