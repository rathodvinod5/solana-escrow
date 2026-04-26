import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaEscrow } from "../target/types/solana_escrow";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";

describe("solana-escrow", () => {
  // Configure the client to use the local cluster.
  // anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.solanaEscrow as Program<SolanaEscrow>;
  const admin = anchor.web3.Keypair.generate();
  const maker = anchor.web3.Keypair.generate();
  const taker = anchor.web3.Keypair.generate();

  let tokenMintA: PublicKey;
  let tokenMintB: PublicKey;
  let makerAtaForTokenA: PublicKey;
  let makerAtaForTokenB: PublicKey;
  let takerAtaForTokenA: PublicKey;
  let takerAtaForTokenB: PublicKey;
  let vault: PublicKey;
  let escrowOffer: PublicKey;
  let escrowSeeds;

  describe("AIRDROP AND CREATE TOKEN MINTS", async () => {
    before(async () => {
      try {
        await airdrop(
          provider.connection,
          admin.publicKey,
          10 * LAMPORTS_PER_SOL,
        );
        await airdrop(
          provider.connection,
          maker.publicKey,
          10 * LAMPORTS_PER_SOL,
        );
        await airdrop(
          provider.connection,
          taker.publicKey,
          10 * LAMPORTS_PER_SOL,
        );
        await airdrop(
          provider.connection,
          provider.wallet.publicKey,
          10 * LAMPORTS_PER_SOL,
        );
      } catch (err) {
        console.log("Error while airdrop: ", err);
      }
    });

    describe("Create token mints", async () => {
      it("should create tokenMintA and tokenMintB", async () => {
        tokenMintA = await createMint(
          provider.connection,
          admin, // payer
          admin.publicKey, // mintAuthority
          admin.publicKey, // freezeAuthority
          9, // mint decimals
        );

        tokenMintB = await createMint(
          provider.connection,
          admin,
          admin.publicKey,
          admin.publicKey,
          9,
        );
      });

      it("should create maker ata for tokenMintA", async () => {});
    });
  });

  describe("CREATE OFFER", async () => {
    describe("happy cases", async () => {});

    describe("failure cases", async () => {});
  });

  describe("TAKE OFFER", async () => {
    describe("happy cases", async () => {});

    describe("failure cases", async () => {});
  });

  describe("REFUND OFFER", async () => {
    describe("happy cases", async () => {});

    describe("failure cases", async () => {});
  });

  describe("OTHER EDGE CASES", async () => {});
});

async function airdrop(connection: any, address: any, amount = 1000000000) {
  await connection.confirmTransaction(
    await connection.requestAirdrop(address, amount),
    "confirmed",
  );
}
