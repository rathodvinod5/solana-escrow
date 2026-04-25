use anchor_lang::prelude::*;

pub mod instructions;
use instructions::*;

pub mod states;
pub mod errors;

declare_id!("2wn5RrK2qCVFGZtrzqqe4kd9ydMzCuvneMeodN82u6DA");

#[program]
pub mod solana_escrow {
    use super::*;

    pub fn init_offer(
        ctx: Context<MakeOffer>, 
        id: u64, 
        token_a_transfer_amount: u64,
        token_b_requested_amount: u64
    ) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        instructions::make_offer(ctx, id, token_a_transfer_amount, token_b_requested_amount)?;
        Ok(())
    }
}
