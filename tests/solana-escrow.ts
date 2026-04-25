import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaEscrow } from "../target/types/solana_escrow";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

describe("solana-escrow", () => {
  // Configure the client to use the local cluster.
  // anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.solanaEscrow as Program<SolanaEscrow>;
  const admin = anchor.web3.Keypair.generate();
  const maker = anchor.web3.Keypair.generate();
  const taker = anchor.web3.Keypair.generate();

  let tokenMintA = PublicKey;
  let tokenMintB = PublicKey;
  let makerAtaForTokenA = PublicKey;
  let makerAtaForTokenB = PublicKey;
  let takerAtaForTokenA = PublicKey;
  let takerAtaForTokenB = PublicKey;
  let vault = PublicKey;
  let escrowOffer = PublicKey;
  let escrowSeeds;

  describe("AIRDROP", async () => {
    await airdrop(provider.connection, admin.publicKey, 10 * LAMPORTS_PER_SOL);
    await airdrop(provider.connection, maker.publicKey, 10 * LAMPORTS_PER_SOL);
    await airdrop(provider.connection, taker.publicKey, 10 * LAMPORTS_PER_SOL);
  });

  describe("CREATE TOKEN MINTS", async () => {
    it("should create tokenMintA", async () => {
      // tokenMintA = await createMint();
    });
  });
});

async function airdrop(connection: any, address: any, amount = 1000000000) {
  await connection.confirmTransaction(
    await connection.requestAirdrop(address, amount),
    "confirmed",
  );
}
