use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("No the owner of the escrow contract")]
    NotTheOwner,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient Amount")]
    InsufficientAmount,
    #[msg("Invalid tokenMint A")]
    InvalidTokenMintA,
    #[msg("Invalid tokenMint B")]
    InvalidTokenMintB,
    #[msg("Invalid maker")]
    InvalidMaker,
}