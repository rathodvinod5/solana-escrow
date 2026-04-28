use anchor_lang::prelude::*;

pub mod instructions;
use instructions::*;

pub mod states;
pub mod errors;

declare_id!("33EkP4wYrTQquuf2QFPkYmeJFTkX1uqbv9HNkiriBCFx");

#[program]
pub mod solana_escrow {
    use super::*;

    pub fn make_offer(
        ctx: Context<MakeOffer>, 
        id: u64, 
        token_a_transfer_amount: u64,
        token_b_requested_amount: u64
    ) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        instructions::make_offer(ctx, id, token_a_transfer_amount, token_b_requested_amount)?;
        Ok(())
    }

    pub fn take_offer(
        ctx: Context<TakeOffer>,
        id: u64
    ) -> Result<()> {
        let _ = instructions::take_offer(ctx, id)?;
        Ok(())
    }

    pub fn refund_offer(
        ctx: Context<RefundOffer>,
        id: u64
    ) -> Result<()> {
        let _ = instructions::refund_offer(ctx, id)?;
        Ok(())
    }
}
