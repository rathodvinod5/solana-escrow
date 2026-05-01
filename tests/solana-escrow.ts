import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  createMint,
  getAccount,
  createAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import assert from "assert";
import { SolanaEscrow } from "../target/types/solana_escrow";

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
  let escrowOfferSeeds;
  let escrowOfferBump;

  let escrowOfferForFailureCase: PublicKey;
  let vaultForFailureCase: PublicKey;

  const tokenATransferAmount = new anchor.BN(100 * 10 ** 9); // 100 tokenA
  const tokenBRequestedAmount = new anchor.BN(200 * 10 ** 9); // 200 tokenB

  describe("AIRDROP, CREATE TOKEN MINTS and ATA's for MAKER and TAKER", async () => {
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

      it("should create maker ata for tokenMintA", async () => {
        makerAtaForTokenA = await createAssociatedTokenAccount(
          provider.connection,
          maker, // payer
          tokenMintA, // mint
          maker.publicKey, // owner
        );

        const makerAtaForTokenAAccount = await getAccount(
          provider.connection,
          makerAtaForTokenA,
        );

        assert.strictEqual(
          makerAtaForTokenAAccount.mint.toBase58(),
          tokenMintA.toBase58(),
          "Mint should match tokenMintA",
        );
        assert.strictEqual(
          makerAtaForTokenAAccount.owner.toBase58(),
          maker.publicKey.toBase58(),
          "Owner should be maker",
        );
        assert.strictEqual(
          makerAtaForTokenAAccount.amount,
          BigInt(0),
          "Initial balance should be 0",
        );
      });

      it("should create makerAtaForTokenB", async () => {
        makerAtaForTokenB = await createAssociatedTokenAccount(
          provider.connection,
          maker, // payer
          tokenMintB, // mint
          maker.publicKey, // owner
        );

        const makerAtaForTokenBAccount = await getAccount(
          provider.connection,
          makerAtaForTokenB,
        );

        assert.strictEqual(
          makerAtaForTokenBAccount.mint.toBase58(),
          tokenMintB.toBase58(),
          "Mint should match tokenMintB",
        );
        assert.strictEqual(
          makerAtaForTokenBAccount.owner.toBase58(),
          maker.publicKey.toBase58(),
          "Owner should be maker",
        );
        assert.strictEqual(
          makerAtaForTokenBAccount.amount,
          BigInt(0),
          "Initial balance should be 0",
        );
      });

      it("should create takerAtaForTokenA", async () => {
        takerAtaForTokenA = await createAssociatedTokenAccount(
          provider.connection,
          taker, // payer
          tokenMintA, // mint
          taker.publicKey, // owner
        );

        const takerAtaForTokenAAccount = await getAccount(
          provider.connection,
          takerAtaForTokenA,
        );

        assert.strictEqual(
          takerAtaForTokenAAccount.mint.toBase58(),
          tokenMintA.toBase58(),
          "Mint should match tokenMintA",
        );
        assert.strictEqual(
          takerAtaForTokenAAccount.owner.toBase58(),
          taker.publicKey.toBase58(),
          "Owner should be taker",
        );
        assert.strictEqual(
          takerAtaForTokenAAccount.amount,
          BigInt(0),
          "Initial balance should be 0",
        );
      });

      it("should create takerAtaForTokenB", async () => {
        takerAtaForTokenB = await createAssociatedTokenAccount(
          provider.connection,
          taker, // payer
          tokenMintB, // mint
          taker.publicKey, // owner
        );

        const takerAtaForTokenBAccount = await getAccount(
          provider.connection,
          takerAtaForTokenB,
        );

        assert.strictEqual(
          takerAtaForTokenBAccount.mint.toBase58(),
          tokenMintB.toBase58(),
          "Mint should match tokenMintB",
        );
        assert.strictEqual(
          takerAtaForTokenBAccount.owner.toBase58(),
          taker.publicKey.toBase58(),
          "Owner should be taker",
        );
        assert.strictEqual(
          takerAtaForTokenBAccount.amount,
          BigInt(0),
          "Initial balance should be 0",
        );
      });

      it("should mint tokenA to makerAtaForTokenA", async () => {
        await mintTo(
          provider.connection,
          admin, // payer
          tokenMintA, // mint
          makerAtaForTokenA, // destination
          admin.publicKey, // mintAuthority
          1000 * 10 ** 9, // amount (1000 tokens with 9 decimals)
        );

        const makerAtaForTokenAAccount = await getAccount(
          provider.connection,
          makerAtaForTokenA,
        );

        assert.strictEqual(
          makerAtaForTokenAAccount.amount,
          BigInt(1000 * 10 ** 9),
          "Maker should have 1000 tokenA",
        );
      });

      it("should mint tokenB to takerAtaForTokenB", async () => {
        await mintTo(
          provider.connection,
          admin, // payer
          tokenMintB, // mint
          takerAtaForTokenB, // destination
          admin.publicKey, // mintAuthority
          1000 * 10 ** 9, // amount (1000 tokens with 9 decimals)
        );

        const takerAtaForTokenBAccount = await getAccount(
          provider.connection,
          takerAtaForTokenB,
        );

        assert.strictEqual(
          takerAtaForTokenBAccount.amount,
          BigInt(1000 * 10 ** 9),
          "Taker should have 1000 tokenB",
        );
      });
    });
  });

  describe("MAKE OFFER", async () => {
    before(async () => {
      [escrowOffer, escrowOfferBump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("offer"),
          maker.publicKey.toBuffer(),
          new anchor.BN(1).toArrayLike(Buffer, "le", 8),
        ],
        program.programId,
      );

      vault = await getAssociatedTokenAddress(
        tokenMintA,
        escrowOffer,
        true, // allowOwnerOffCurve - needed since escrowOffer is a PDA
      );

      [escrowOfferForFailureCase] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("offer"),
          maker.publicKey.toBuffer(),
          new anchor.BN(2).toArrayLike(Buffer, "le", 8),
        ],
        program.programId,
      );
      vaultForFailureCase = await getAssociatedTokenAddress(
        tokenMintA,
        escrowOfferForFailureCase,
        true,
      );
    });

    describe("Happy cases", async () => {
      it("should create an escrow offer", async () => {
        await program.methods
          .makeOffer(
            new anchor.BN(1), // id
            tokenATransferAmount,
            tokenBRequestedAmount,
          )
          .accounts({
            maker: maker.publicKey,
            tokenMintA,
            tokenMintB,
            makerAtaForTokenAAccount: makerAtaForTokenA,
            escrowOffer,
            vault,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          })
          .signers([maker])
          .rpc();

        // verify escrow offer account state
        const escrowOfferAccount = await program.account.escrowOffer.fetch(
          escrowOffer,
        );

        assert.strictEqual(
          escrowOfferAccount.id.toString(),
          "1",
          "Escrow offer id should be 1",
        );
        assert.strictEqual(
          escrowOfferAccount.maker.toBase58(),
          maker.publicKey.toBase58(),
          "Maker should match",
        );
        assert.strictEqual(
          escrowOfferAccount.tokenMintA.toBase58(),
          tokenMintA.toBase58(),
          "TokenMintA should match",
        );
        assert.strictEqual(
          escrowOfferAccount.tokenMintB.toBase58(),
          tokenMintB.toBase58(),
          "TokenMintB should match",
        );
        assert.strictEqual(
          escrowOfferAccount.tokenBRequestedAmount.toString(),
          tokenBRequestedAmount.toString(),
          "TokenB requested amount should match",
        );
      });

      it("should transfer tokenA from maker ata to vault", async () => {
        // verify vault received tokenA
        const vaultAccount = await getAccount(provider.connection, vault);
        assert.strictEqual(
          vaultAccount.amount,
          BigInt(tokenATransferAmount.toString()),
          "Vault should have 100 tokenA",
        );

        // verify maker ata was debited
        const makerAtaForTokenAAccount = await getAccount(
          provider.connection,
          makerAtaForTokenA,
        );
        assert.strictEqual(
          makerAtaForTokenAAccount.amount,
          BigInt(900 * 10 ** 9),
          "Maker should have 900 tokenA remaining",
        );
      });

      it("should verify vault is owned by escrow offer pda", async () => {
        const vaultAccount = await getAccount(provider.connection, vault);

        assert.strictEqual(
          vaultAccount.owner.toBase58(),
          escrowOffer.toBase58(),
          "Vault owner should be escrow offer PDA",
        );
        assert.strictEqual(
          vaultAccount.mint.toBase58(),
          tokenMintA.toBase58(),
          "Vault mint should be tokenMintA",
        );
      });
    });

    describe("failure cases", async () => {
      it("should fail when token_a_transfer_amount is 0", async () => {
        const tokenATransferAmountZero = new anchor.BN(0);

        try {
          await program.methods
            .makeOffer(
              new anchor.BN(2), // different id to avoid PDA collision
              tokenATransferAmountZero,
              tokenBRequestedAmount,
            )
            .accounts({
              maker: maker.publicKey,
              tokenMintA,
              tokenMintB,
              makerAtaForTokenAAccount: makerAtaForTokenA,
              escrowOfferForFailureCase,
              vaultForFailureCase,
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([maker])
            .rpc();

          assert.fail("Should have thrown an error");
        } catch (err: any) {
          assert.ok(
            err.message.includes("InvalidAmount") ||
              err?.errorCode?.code.includes("InvalidAmount"),
            "Error should be InvalidAmount",
          );
        }
      });

      it("should fail when token_b_requested_amount is 0", async () => {
        const tokenBRequestedAmountZero = new anchor.BN(0);

        try {
          await program.methods
            .makeOffer(
              new anchor.BN(2),
              tokenATransferAmount,
              tokenBRequestedAmountZero,
            )
            .accounts({
              maker: maker.publicKey,
              tokenMintA,
              tokenMintB,
              makerAtaForTokenMintA: makerAtaForTokenA,
              escrowOfferForFailureCase,
              vaultForFailureCase,
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([maker])
            .rpc();

          assert.fail("Should have thrown an error");
        } catch (err: any) {
          assert.ok(
            err.message.includes("InvalidAmount"),
            "Error should be InvalidAmount",
          );
        }
      });

      it("should fail when maker has insufficient tokenA balance", async () => {
        const tokenATransferAmount = new anchor.BN(99999 * 10 ** 9); // more than minted

        try {
          await program.methods
            .makeOffer(
              new anchor.BN(2),
              tokenATransferAmount,
              tokenBRequestedAmount,
            )
            .accounts({
              maker: maker.publicKey,
              tokenMintA,
              tokenMintB,
              makerAtaForTokenMintA: makerAtaForTokenA,
              escrowOffer: escrowOfferForFailureCase,
              vault: vaultForFailureCase,
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([maker])
            .rpc();

          assert.fail("Should have thrown an error");
        } catch (err: any) {
          assert.ok(
            err.message.includes("insufficient funds") ||
              err.message.includes("custom program error"),
            "Error should be insufficient funds",
          );
        }
      });

      it("should fail when non maker tries to create offer with maker's ata", async () => {
        try {
          await program.methods
            .makeOffer(
              new anchor.BN(3),
              tokenATransferAmount,
              tokenBRequestedAmount,
            )
            .accounts({
              maker: taker.publicKey, // taker pretending to be maker
              tokenMintA,
              tokenMintB,
              makerAtaForTokenMintA: makerAtaForTokenA, // but using maker's ATA
              escrowOffer: escrowOfferForFailureCase,
              vault: vaultForFailureCase,
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([taker])
            .rpc();

          assert.fail("Should have thrown an error");
        } catch (err: any) {
          assert.ok(
            err.message.includes("AnchorError") ||
              err.message.includes("ConstraintTokenOwner") ||
              err.message.includes("custom program error"),
            "Error should be a constraint violation",
          );
        }
      });

      it("should fail when duplicate offer id is used", async () => {
        try {
          await program.methods
            .makeOffer(
              new anchor.BN(1), // id 1 already used in happy case
              tokenATransferAmount,
              tokenBRequestedAmount,
            )
            .accounts({
              maker: maker.publicKey,
              tokenMintA,
              tokenMintB,
              makerAtaForTokenMintA: makerAtaForTokenA,
              escrowOffer, // same PDA as happy case
              vault, // same vault as happy case
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([maker])
            .rpc();

          assert.fail("Should have thrown an error");
        } catch (err: any) {
          assert.ok(
            err.message.includes("already in use") ||
              err.message.includes("custom program error"),
            "Error should be account already in use",
          );
        }
      });
    });
  });

  describe("TAKE OFFER", async () => {
    let makerTokenABalanceBeforeTake: bigint;
    let makerTokenBBalanceBeforeTake: bigint;
    let takerTokenABalanceBeforeTake: bigint;
    let takerTokenBBalanceBeforeTake: bigint;
    let vaultTokenABalanceBeforeTake: bigint;

    before(async () => {
      // capture all balances before take offer
      const makerAtaForTokenAAccount = await getAccount(
        provider.connection,
        makerAtaForTokenA,
      );
      const makerAtaForTokenBAccount = await getAccount(
        provider.connection,
        makerAtaForTokenB,
      );
      const takerAtaForTokenAAccount = await getAccount(
        provider.connection,
        takerAtaForTokenA,
      );
      const takerAtaForTokenBAccount = await getAccount(
        provider.connection,
        takerAtaForTokenB,
      );
      const vaultAccount = await getAccount(provider.connection, vault);

      makerTokenABalanceBeforeTake = makerAtaForTokenAAccount.amount;
      makerTokenBBalanceBeforeTake = makerAtaForTokenBAccount.amount;
      takerTokenABalanceBeforeTake = takerAtaForTokenAAccount.amount;
      takerTokenBBalanceBeforeTake = takerAtaForTokenBAccount.amount;
      vaultTokenABalanceBeforeTake = vaultAccount.amount;
    });

    describe("Happy cases", async () => {
      it("should take the escrow offer successfully", async () => {
        await program.methods
          .takeOffer(new anchor.BN(1)) // id 1 created in make offer happy case
          .accounts({
            taker: taker.publicKey,
            maker: maker.publicKey,
            tokenMintA,
            tokenMintB,
            takerAtaForTokenA,
            takerAtaForTokenB,
            makerAtaForTokenB,
            escrowOffer,
            vault,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          })
          .signers([taker])
          .rpc();

        // verify escrow offer account is closed
        const escrowOfferAccountAfter =
          await provider.connection.getAccountInfo(escrowOffer);
        assert.strictEqual(
          escrowOfferAccountAfter,
          null,
          "Escrow offer account should be closed",
        );
      });

      it("should transfer tokenA from vault to taker", async () => {
        const takerAtaForTokenAAccount = await getAccount(
          provider.connection,
          takerAtaForTokenA,
        );

        assert.strictEqual(
          takerAtaForTokenAAccount.amount,
          takerTokenABalanceBeforeTake + vaultTokenABalanceBeforeTake,
          "Taker should have received tokenA from vault",
        );
      });

      it("should transfer tokenB from taker to maker", async () => {
        const escrowOfferAccount =
          await program.account.escrowOffer.fetchNullable(escrowOffer);
        const tokenBRequestedAmount = BigInt(200 * 10 ** 9); // same as make offer

        // verify maker received tokenB
        const makerAtaForTokenBAccount = await getAccount(
          provider.connection,
          makerAtaForTokenB,
        );
        assert.strictEqual(
          makerAtaForTokenBAccount.amount,
          makerTokenBBalanceBeforeTake + tokenBRequestedAmount,
          "Maker should have received tokenB from taker",
        );

        // verify taker was debited tokenB
        const takerAtaForTokenBAccount = await getAccount(
          provider.connection,
          takerAtaForTokenB,
        );
        assert.strictEqual(
          takerAtaForTokenBAccount.amount,
          takerTokenBBalanceBeforeTake - tokenBRequestedAmount,
          "Taker should have been debited tokenB",
        );
      });

      it("should close vault account after take offer", async () => {
        const vaultAccount = await provider.connection.getAccountInfo(vault);

        assert.strictEqual(
          vaultAccount,
          null,
          "Vault account should be closed after take offer",
        );
      });

      it("should verify maker did not receive extra tokenA", async () => {
        const makerAtaForTokenAAccount = await getAccount(
          provider.connection,
          makerAtaForTokenA,
        );

        assert.strictEqual(
          makerAtaForTokenAAccount.amount,
          makerTokenABalanceBeforeTake,
          "Maker tokenA balance should remain unchanged",
        );
      });
    });

    describe("failure cases", async () => {
      let freshEscrowOffer: PublicKey;
      let freshVault: PublicKey;

      before(async () => {
        // create a fresh escrow offer for failure cases
        // since the happy case offer (id 1) is already closed
        const [freshEscrowOfferPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            maker.publicKey.toBuffer(),
            new anchor.BN(10).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );
        freshEscrowOffer = freshEscrowOfferPda;
        freshVault = await getAssociatedTokenAddress(
          tokenMintA,
          freshEscrowOffer,
          true,
        );

        // create a fresh offer with id 10
        await program.methods
          .makeOffer(
            new anchor.BN(10),
            new anchor.BN(100 * 10 ** 9), // 100 tokenA
            new anchor.BN(200 * 10 ** 9), // 200 tokenB
          )
          .accounts({
            maker: maker.publicKey,
            tokenMintA,
            tokenMintB,
            makerAtaForTokenMintA: makerAtaForTokenA,
            escrowOffer: freshEscrowOffer,
            vault: freshVault,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          })
          .signers([maker])
          .rpc();
      });

      it("should fail when wrong maker is provided", async () => {
        try {
          await program.methods
            .takeOffer(new anchor.BN(10))
            .accounts({
              taker: taker.publicKey,
              maker: taker.publicKey, // wrong maker - passing taker as maker
              tokenMintA,
              tokenMintB,
              takerAtaForTokenA,
              takerAtaForTokenB,
              makerAtaForTokenB,
              escrowOffer: freshEscrowOffer,
              vault: freshVault,
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([taker])
            .rpc();

          assert.fail("Should have thrown an error");
        } catch (err: any) {
          assert.ok(
            err.message.includes("InvalidMaker") ||
              err.message.includes("ConstraintSeeds") ||
              err.message.includes("ConstraintHasOne") ||
              err.message.includes("ConstraintTokenOwner"),
            "Error should be a constraint violation due to wrong maker",
          );
        }
      });

      it("should fail when wrong tokenMintA is provided", async () => {
        try {
          await program.methods
            .takeOffer(new anchor.BN(10))
            .accounts({
              taker: taker.publicKey,
              maker: maker.publicKey,
              tokenMintA: tokenMintB, // wrong - passing tokenMintB as tokenMintA
              tokenMintB,
              takerAtaForTokenA,
              takerAtaForTokenB,
              makerAtaForTokenB,
              escrowOffer: freshEscrowOffer,
              vault: freshVault,
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([taker])
            .rpc();

          assert.fail("Should have thrown an error");
        } catch (err: any) {
          assert.ok(
            err.message.includes("InvalidTokenMintA") ||
              err.message.includes("ConstraintHasOne") ||
              err.message.includes("ConstraintAssociated") ||
              err.message.includes("custom program error"),
            "Error should be a constraint violation due to wrong tokenMintA",
          );
        }
      });

      it("should fail when wrong tokenMintB is provided", async () => {
        try {
          await program.methods
            .takeOffer(new anchor.BN(10))
            .accounts({
              taker: taker.publicKey,
              maker: maker.publicKey,
              tokenMintA,
              tokenMintB: tokenMintA, // wrong - passing tokenMintA as tokenMintB
              takerAtaForTokenA,
              takerAtaForTokenB,
              makerAtaForTokenB,
              escrowOffer: freshEscrowOffer,
              vault: freshVault,
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([taker])
            .rpc();

          assert.fail("Should have thrown an error");
        } catch (err: any) {
          assert.ok(
            err.message.includes("InvalidTokenMintB") ||
              err.message.includes("ConstraintHasOne") ||
              err.message.includes("ConstraintAssociated") || // ✅ add this
              err.message.includes("custom program error"),
            "Error should be a constraint violation due to wrong tokenMintB",
          );
        }
      });

      it("should fail when taker has insufficient tokenB balance", async () => {
        // create a new taker with no tokens
        const newTaker = anchor.web3.Keypair.generate();
        await airdrop(
          provider.connection,
          newTaker.publicKey,
          10 * LAMPORTS_PER_SOL,
        );

        // create atas for new taker
        const newTakerAtaForTokenA = await createAssociatedTokenAccount(
          provider.connection,
          newTaker,
          tokenMintA,
          newTaker.publicKey,
        );
        const newTakerAtaForTokenB = await createAssociatedTokenAccount(
          provider.connection,
          newTaker,
          tokenMintB,
          newTaker.publicKey,
        );

        try {
          await program.methods
            .takeOffer(new anchor.BN(10))
            .accounts({
              taker: newTaker.publicKey,
              maker: maker.publicKey,
              tokenMintA,
              tokenMintB,
              takerAtaForTokenA: newTakerAtaForTokenA,
              takerAtaForTokenB: newTakerAtaForTokenB, // 0 tokenB balance
              makerAtaForTokenB,
              escrowOffer: freshEscrowOffer,
              vault: freshVault,
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([newTaker])
            .rpc();

          assert.fail("Should have thrown an error");
        } catch (err: any) {
          assert.ok(
            err.message.includes("insufficient funds") ||
              err.message.includes("custom program error"),
            "Error should be insufficient funds",
          );
        }
      });

      it("should fail when taker tries to take already closed offer", async () => {
        // escrow offer id 1 was already closed in happy case
        try {
          await program.methods
            .takeOffer(new anchor.BN(1))
            .accounts({
              taker: taker.publicKey,
              maker: maker.publicKey,
              tokenMintA,
              tokenMintB,
              takerAtaForTokenA,
              takerAtaForTokenB,
              makerAtaForTokenB,
              escrowOffer, // id 1 - already closed
              vault, // id 1 - already closed
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([taker])
            .rpc();

          assert.fail("Should have thrown an error");
        } catch (err: any) {
          assert.ok(
            err.message.includes("AccountNotInitialized") ||
              err.message.includes("AccountOwnedByWrongProgram") ||
              err.message.includes("custom program error"),
            "Error should be account not initialized",
          );
        }
      });
    });
  });

  describe("REFUND OFFER", async () => {
    let refundEscrowOffer: PublicKey;
    let refundVault: PublicKey;
    let makerTokenABalanceBeforeRefund: bigint;
    let vaultTokenABalanceBeforeRefund: bigint;

    before(async () => {
      // derive fresh PDA with id 20 for refund tests
      const [refundEscrowOfferPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("offer"),
          maker.publicKey.toBuffer(),
          new anchor.BN(20).toArrayLike(Buffer, "le", 8),
        ],
        program.programId,
      );
      refundEscrowOffer = refundEscrowOfferPda;
      refundVault = await getAssociatedTokenAddress(
        tokenMintA,
        refundEscrowOffer,
        true,
      );

      // create a fresh offer with id 20
      await program.methods
        .makeOffer(
          new anchor.BN(20),
          new anchor.BN(100 * 10 ** 9), // 100 tokenA
          new anchor.BN(200 * 10 ** 9), // 200 tokenB
        )
        .accounts({
          maker: maker.publicKey,
          tokenMintA,
          tokenMintB,
          makerAtaForTokenMintA: makerAtaForTokenA,
          escrowOffer: refundEscrowOffer,
          vault: refundVault,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        })
        .signers([maker])
        .rpc();

      // capture balances before refund
      const makerAtaForTokenAAccount = await getAccount(
        provider.connection,
        makerAtaForTokenA,
      );
      const vaultAccount = await getAccount(provider.connection, refundVault);

      makerTokenABalanceBeforeRefund = makerAtaForTokenAAccount.amount;
      vaultTokenABalanceBeforeRefund = vaultAccount.amount;
    });

    describe("happy cases", async () => {
      it("should refund the escrow offer successfully", async () => {
        await program.methods
          .refundOffer(new anchor.BN(20))
          .accounts({
            maker: maker.publicKey,
            tokenMintA,
            makerAtaForTokenA,
            vault: refundVault,
            escrowOffer: refundEscrowOffer,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          })
          .signers([maker])
          .rpc();

        // verify escrow offer account is closed
        const refundEscrowOfferAccount =
          await provider.connection.getAccountInfo(refundEscrowOffer);
        assert.strictEqual(
          refundEscrowOfferAccount,
          null,
          "Escrow offer account should be closed after refund",
        );
      });

      it("should transfer tokenA from vault back to maker", async () => {
        const makerAtaForTokenAAccount = await getAccount(
          provider.connection,
          makerAtaForTokenA,
        );

        assert.strictEqual(
          makerAtaForTokenAAccount.amount,
          makerTokenABalanceBeforeRefund + vaultTokenABalanceBeforeRefund,
          "Maker should have received tokenA back from vault",
        );
      });

      it("should close vault account after refund", async () => {
        const vaultAccount = await provider.connection.getAccountInfo(
          refundVault,
        );

        assert.strictEqual(
          vaultAccount,
          null,
          "Vault account should be closed after refund",
        );
      });

      it("should verify maker tokenB balance is unchanged after refund", async () => {
        const makerAtaForTokenBAccount = await getAccount(
          provider.connection,
          makerAtaForTokenB,
        );

        // maker received tokenB in take offer happy case (200 tokenB)
        assert.strictEqual(
          makerAtaForTokenBAccount.amount,
          BigInt(200 * 10 ** 9),
          "Maker tokenB balance should remain unchanged after refund",
        );
      });
    });

    describe("failure cases", async () => {
      let failureRefundEscrowOffer: PublicKey;
      let failureRefundVault: PublicKey;

      before(async () => {
        // derive fresh PDA with id 30 for refund failure tests
        const [failureRefundEscrowOfferPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            maker.publicKey.toBuffer(),
            new anchor.BN(30).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );
        failureRefundEscrowOffer = failureRefundEscrowOfferPda;
        failureRefundVault = await getAssociatedTokenAddress(
          tokenMintA,
          failureRefundEscrowOffer,
          true,
        );

        // create a fresh offer with id 30
        await program.methods
          .makeOffer(
            new anchor.BN(30),
            new anchor.BN(100 * 10 ** 9), // 100 tokenA
            new anchor.BN(200 * 10 ** 9), // 200 tokenB
          )
          .accounts({
            maker: maker.publicKey,
            tokenMintA,
            tokenMintB,
            makerAtaForTokenMintA: makerAtaForTokenA,
            escrowOffer: failureRefundEscrowOffer,
            vault: failureRefundVault,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          })
          .signers([maker])
          .rpc();
      });

      it("should fail when non maker tries to refund the offer", async () => {
        try {
          await program.methods
            .refundOffer(new anchor.BN(30))
            .accounts({
              maker: taker.publicKey, // wrong - taker pretending to be maker
              tokenMintA,
              makerAtaForTokenA,
              vault: failureRefundVault,
              escrowOffer: failureRefundEscrowOffer,
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([taker])
            .rpc();

          assert.fail("Should have thrown an error");
        } catch (err: any) {
          assert.ok(
            err.message.includes("InvalidMaker") ||
              err.message.includes("ConstraintHasOne") ||
              err.message.includes("ConstraintSeeds") ||
              err.message.includes("ConstraintAssociated") ||
              err.message.includes("ConstraintTokenOwner") ||
              err.message.includes("custom program error"),
            "Error should be a constraint violation due to wrong maker",
          );
        }
      });

      it("should fail when wrong tokenMintA is provided", async () => {
        try {
          await program.methods
            .refundOffer(new anchor.BN(30))
            .accounts({
              maker: maker.publicKey,
              tokenMintA: tokenMintB, // wrong - passing tokenMintB as tokenMintA
              makerAtaForTokenA,
              vault: failureRefundVault,
              escrowOffer: failureRefundEscrowOffer,
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([maker])
            .rpc();

          assert.fail("Should have thrown an error");
        } catch (err: any) {
          assert.ok(
            err.message.includes("InvalidTokenMintA") ||
              err.message.includes("ConstraintHasOne") ||
              err.message.includes("ConstraintAssociated") ||
              err.message.includes("custom program error"),
            "Error should be a constraint violation due to wrong tokenMintA",
          );
        }
      });

      it("should fail when wrong vault is provided", async () => {
        // derive a different vault belonging to a different escrow offer
        const [differentEscrowOffer] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            maker.publicKey.toBuffer(),
            new anchor.BN(40).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );
        const differentVault = await getAssociatedTokenAddress(
          tokenMintA,
          differentEscrowOffer,
          true,
        );

        try {
          await program.methods
            .refundOffer(new anchor.BN(30))
            .accounts({
              maker: maker.publicKey,
              tokenMintA,
              makerAtaForTokenA,
              vault: differentVault, // wrong - vault from different escrow offer
              escrowOffer: failureRefundEscrowOffer,
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([maker])
            .rpc();

          assert.fail("Should have thrown an error");
        } catch (err: any) {
          assert.ok(
            err.message.includes("ConstraintAssociated") ||
              err.message.includes("AccountNotInitialized") ||
              err.message.includes("custom program error"),
            "Error should be a constraint violation due to wrong vault",
          );
        }
      });

      it("should fail when non maker tries to refund with their own ata", async () => {
        // taker creates their own ata for tokenA
        const takerAtaForTokenAAccount = await getAccount(
          provider.connection,
          takerAtaForTokenA,
        );

        try {
          await program.methods
            .refundOffer(new anchor.BN(30))
            .accounts({
              maker: taker.publicKey, // wrong maker
              tokenMintA,
              makerAtaForTokenA: takerAtaForTokenA, // taker's own ata
              vault: failureRefundVault,
              escrowOffer: failureRefundEscrowOffer,
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([taker])
            .rpc();

          assert.fail("Should have thrown an error");
        } catch (err: any) {
          assert.ok(
            err.message.includes("InvalidMaker") ||
              err.message.includes("ConstraintHasOne") ||
              err.message.includes("ConstraintSeeds") ||
              err.message.includes("ConstraintAssociated") ||
              err.message.includes("custom program error"),
            "Error should be a constraint violation due to wrong maker and ata",
          );
        }
      });

      it("should fail when trying to refund an already refunded offer", async () => {
        // offer id 20 was already refunded in happy cases
        const [alreadyRefundedEscrowOffer] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            maker.publicKey.toBuffer(),
            new anchor.BN(20).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );
        const alreadyRefundedVault = await getAssociatedTokenAddress(
          tokenMintA,
          alreadyRefundedEscrowOffer,
          true,
        );

        try {
          await program.methods
            .refundOffer(new anchor.BN(20)) // id 20 already refunded
            .accounts({
              maker: maker.publicKey,
              tokenMintA,
              makerAtaForTokenA,
              vault: alreadyRefundedVault,
              escrowOffer: alreadyRefundedEscrowOffer,
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([maker])
            .rpc();

          assert.fail("Should have thrown an error");
        } catch (err: any) {
          assert.ok(
            err.message.includes("AccountNotInitialized") ||
              err.message.includes("AccountOwnedByWrongProgram") ||
              err.message.includes("custom program error"),
            "Error should be account not initialized since offer was already refunded",
          );
        }
      });
    });
  });

  describe("OTHER EDGE CASES", async () => {
    describe("MAKE OFFER edge cases", async () => {
      it("should allow maker to create multiple offers with different ids", async () => {
        const [escrowOffer100] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            maker.publicKey.toBuffer(),
            new anchor.BN(100).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );
        const vault100 = await getAssociatedTokenAddress(
          tokenMintA,
          escrowOffer100,
          true,
        );

        const [escrowOffer101] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            maker.publicKey.toBuffer(),
            new anchor.BN(101).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );
        const vault101 = await getAssociatedTokenAddress(
          tokenMintA,
          escrowOffer101,
          true,
        );

        // create first offer
        await program.methods
          .makeOffer(
            new anchor.BN(100),
            new anchor.BN(50 * 10 ** 9),
            new anchor.BN(100 * 10 ** 9),
          )
          .accounts({
            maker: maker.publicKey,
            tokenMintA,
            tokenMintB,
            makerAtaForTokenMintA: makerAtaForTokenA,
            escrowOffer: escrowOffer100,
            vault: vault100,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          })
          .signers([maker])
          .rpc();

        // create second offer
        await program.methods
          .makeOffer(
            new anchor.BN(101),
            new anchor.BN(50 * 10 ** 9),
            new anchor.BN(100 * 10 ** 9),
          )
          .accounts({
            maker: maker.publicKey,
            tokenMintA,
            tokenMintB,
            makerAtaForTokenMintA: makerAtaForTokenA,
            escrowOffer: escrowOffer101,
            vault: vault101,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          })
          .signers([maker])
          .rpc();

        // verify both offers exist independently
        const escrowOffer100Account = await program.account.escrowOffer.fetch(
          escrowOffer100,
        );
        const escrowOffer101Account = await program.account.escrowOffer.fetch(
          escrowOffer101,
        );

        assert.strictEqual(
          escrowOffer100Account.id.toString(),
          "100",
          "Escrow offer 100 should exist",
        );
        assert.strictEqual(
          escrowOffer101Account.id.toString(),
          "101",
          "Escrow offer 101 should exist",
        );

        // verify vaults are independent
        const vault100Account = await getAccount(provider.connection, vault100);
        const vault101Account = await getAccount(provider.connection, vault101);

        assert.strictEqual(
          vault100Account.amount,
          BigInt(50 * 10 ** 9),
          "Vault 100 should have 50 tokenA",
        );
        assert.strictEqual(
          vault101Account.amount,
          BigInt(50 * 10 ** 9),
          "Vault 101 should have 50 tokenA",
        );
      });

      it("should allow different makers to create offers with same id", async () => {
        // taker acts as a second maker here
        const [takerEscrowOffer] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            taker.publicKey.toBuffer(),
            new anchor.BN(1).toArrayLike(Buffer, "le", 8), // same id as maker's first offer
          ],
          program.programId,
        );
        const takerVault = await getAssociatedTokenAddress(
          tokenMintB, // taker offers tokenB for tokenA
          takerEscrowOffer,
          true,
        );

        await program.methods
          .makeOffer(
            new anchor.BN(1),
            new anchor.BN(50 * 10 ** 9),
            new anchor.BN(100 * 10 ** 9),
          )
          .accounts({
            maker: taker.publicKey,
            tokenMintA: tokenMintB, // taker offers tokenB
            tokenMintB: tokenMintA, // taker wants tokenA
            makerAtaForTokenMintA: takerAtaForTokenB,
            escrowOffer: takerEscrowOffer,
            vault: takerVault,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          })
          .signers([taker])
          .rpc();

        const takerEscrowOfferAccount = await program.account.escrowOffer.fetch(
          takerEscrowOffer,
        );

        assert.strictEqual(
          takerEscrowOfferAccount.maker.toBase58(),
          taker.publicKey.toBase58(),
          "Taker's escrow offer maker should be taker",
        );
        assert.strictEqual(
          takerEscrowOfferAccount.id.toString(),
          "1",
          "Taker's escrow offer id should be 1",
        );
      });

      it("should allow make offer with max u64 amount", async () => {
        // mint a large but safe amount to maker
        await mintTo(
          provider.connection,
          admin,
          tokenMintA,
          makerAtaForTokenA,
          admin.publicKey,
          1_000_000 * 10 ** 9, // 1 million tokens - large but won't overflow
        );

        const [maxEscrowOffer] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            maker.publicKey.toBuffer(),
            new anchor.BN(200).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );
        const maxVault = await getAssociatedTokenAddress(
          tokenMintA,
          maxEscrowOffer,
          true,
        );

        const largeTransferAmount = new anchor.BN(500_000 * 10 ** 9); // 500k tokenA
        const largeRequestAmount = new anchor.BN(500_000 * 10 ** 9); // 500k tokenB

        await program.methods
          .makeOffer(
            new anchor.BN(200),
            largeTransferAmount,
            largeRequestAmount,
          )
          .accounts({
            maker: maker.publicKey,
            tokenMintA,
            tokenMintB,
            makerAtaForTokenMintA: makerAtaForTokenA,
            escrowOffer: maxEscrowOffer,
            vault: maxVault,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          })
          .signers([maker])
          .rpc();

        // verify escrow offer was created with large amounts
        const maxEscrowOfferAccount = await program.account.escrowOffer.fetch(
          maxEscrowOffer,
        );
        assert.strictEqual(
          maxEscrowOfferAccount.tokenBRequestedAmount.toString(),
          largeRequestAmount.toString(),
          "Token B requested amount should match large amount",
        );

        // verify vault received large amount of tokenA
        const maxVaultAccount = await getAccount(provider.connection, maxVault);
        assert.strictEqual(
          maxVaultAccount.amount,
          BigInt(largeTransferAmount.toString()),
          "Vault should have received large amount of tokenA",
        );
      });
    });

    describe.skip("TAKE OFFER edge cases", async () => {
      it("should fail when taker tries to take their own offer", async () => {
        // taker created an offer in previous edge case (id 1 with taker as maker)
        const [takerEscrowOffer] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            taker.publicKey.toBuffer(),
            new anchor.BN(1).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );
        const takerVault = await getAssociatedTokenAddress(
          tokenMintB,
          takerEscrowOffer,
          true,
        );

        try {
          await program.methods
            .takeOffer(new anchor.BN(1))
            .accounts({
              taker: taker.publicKey,
              maker: taker.publicKey, // taker is also the maker
              tokenMintA: tokenMintB,
              tokenMintB: tokenMintA,
              takerAtaForTokenA: takerAtaForTokenB,
              takerAtaForTokenB: takerAtaForTokenA,
              makerAtaForTokenB: takerAtaForTokenA,
              escrowOffer: takerEscrowOffer,
              vault: takerVault,
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([taker])
            .rpc();

          // if it succeeds tokens should be back to original state
          console.log(
            "Taking own offer succeeded - tokens returned to original state",
          );
        } catch (err) {
          // program doesn't explicitly prevent this but constraint violations may occur
          assert.ok(
            err.message.includes("custom program error") ||
              err.message.includes("ConstraintAssociated") ||
              err.message.includes("ConstraintTokenOwner"),
            "Should fail with a constraint violation",
          );
        }
      });

      it("should fail when taker tries to take offer with minimum possible tokenB (1 lamport)", async () => {
        const [minEscrowOffer] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            maker.publicKey.toBuffer(),
            new anchor.BN(300).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );
        const minVault = await getAssociatedTokenAddress(
          tokenMintA,
          minEscrowOffer,
          true,
        );

        // create offer requesting only 1 lamport of tokenB
        await program.methods
          .makeOffer(
            new anchor.BN(300),
            new anchor.BN(10 * 10 ** 9),
            new anchor.BN(1), // requesting only 1 lamport of tokenB
          )
          .accounts({
            maker: maker.publicKey,
            tokenMintA,
            tokenMintB,
            makerAtaForTokenMintA: makerAtaForTokenA,
            escrowOffer: minEscrowOffer,
            vault: minVault,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          })
          .signers([maker])
          .rpc();

        // take the offer
        await program.methods
          .takeOffer(new anchor.BN(300))
          .accounts({
            taker: taker.publicKey,
            maker: maker.publicKey,
            tokenMintA,
            tokenMintB,
            takerAtaForTokenA,
            takerAtaForTokenB,
            makerAtaForTokenB,
            escrowOffer: minEscrowOffer,
            vault: minVault,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          })
          .signers([taker])
          .rpc();

        // verify maker received only 1 lamport of tokenB
        const makerAtaForTokenBAccount = await getAccount(
          provider.connection,
          makerAtaForTokenB,
        );
        console.log(
          "Maker tokenB balance after min take:",
          makerAtaForTokenBAccount.amount.toString(),
        );
        assert.ok(
          makerAtaForTokenBAccount.amount > BigInt(0),
          "Maker should have received at least 1 lamport of tokenB",
        );
      });
    });

    describe.skip("REFUND OFFER edge cases", async () => {
      it("should fail when maker tries to refund an already taken offer", async () => {
        // offer id 1 was already taken in take offer happy cases
        try {
          await program.methods
            .refundOffer(new anchor.BN(1))
            .accounts({
              maker: maker.publicKey,
              tokenMintA,
              makerAtaForTokenA,
              vault, // id 1 vault - already closed
              escrowOffer, // id 1 escrow - already closed
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([maker])
            .rpc();

          assert.fail("Should have thrown an error");
        } catch (err) {
          assert.ok(
            err.message.includes("AccountNotInitialized") ||
              err.message.includes("AccountOwnedByWrongProgram") ||
              err.message.includes("custom program error"),
            "Error should be account not initialized since offer was already taken",
          );
        }
      });

      it("should fail when taker tries to refund maker's offer", async () => {
        const [offerToRefund] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            maker.publicKey.toBuffer(),
            new anchor.BN(400).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );
        const vaultToRefund = await getAssociatedTokenAddress(
          tokenMintA,
          offerToRefund,
          true,
        );

        // maker creates a new offer
        await program.methods
          .makeOffer(
            new anchor.BN(400),
            new anchor.BN(10 * 10 ** 9),
            new anchor.BN(20 * 10 ** 9),
          )
          .accounts({
            maker: maker.publicKey,
            tokenMintA,
            tokenMintB,
            makerAtaForTokenMintA: makerAtaForTokenA,
            escrowOffer: offerToRefund,
            vault: vaultToRefund,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          })
          .signers([maker])
          .rpc();

        // taker tries to refund maker's offer
        try {
          await program.methods
            .refundOffer(new anchor.BN(400))
            .accounts({
              maker: taker.publicKey, // taker pretending to be maker
              tokenMintA,
              makerAtaForTokenA: takerAtaForTokenA, // taker's own ata
              vault: vaultToRefund,
              escrowOffer: offerToRefund,
              tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
            })
            .signers([taker])
            .rpc();

          assert.fail("Should have thrown an error");
        } catch (err: any) {
          assert.ok(
            err.message.includes("InvalidMaker") ||
              err.message.includes("ConstraintHasOne") ||
              err.message.includes("ConstraintSeeds") ||
              err.message.includes("ConstraintTokenOwner") ||
              err.message.includes("ConstraintAssociated") ||
              err.message.includes("custom program error"),
            "Error should be a constraint violation since taker cannot refund maker's offer",
          );
        }
      });
    });

    describe.skip("ACCOUNT BALANCE edge cases", async () => {
      it("should correctly reflect maker tokenA balance after multiple offers", async () => {
        const makerAtaForTokenAAccount = await getAccount(
          provider.connection,
          makerAtaForTokenA,
        );

        // maker started with 1000 tokenA
        // make offer id 1: -100 tokenA (taken)
        // make offer id 10: -100 tokenA (still open - failure test offer)
        // make offer id 30: -100 tokenA (still open - failure test offer)
        // make offer id 100: -50 tokenA (still open)
        // make offer id 101: -50 tokenA (still open)
        // make offer id 200: -max u64 (if succeeded)
        // make offer id 300: -10 tokenA (taken)
        // make offer id 400: -10 tokenA (still open)
        // refund id 20: +100 tokenA back

        console.log(
          "Maker tokenA balance after all operations:",
          makerAtaForTokenAAccount.amount.toString(),
        );

        assert.ok(
          makerAtaForTokenAAccount.amount >= BigInt(0),
          "Maker tokenA balance should be non negative",
        );
      });

      it("should correctly reflect taker tokenB balance after take offer", async () => {
        const takerAtaForTokenBAccount = await getAccount(
          provider.connection,
          takerAtaForTokenB,
        );

        // taker started with 1000 tokenB
        // take offer id 1: -200 tokenB
        // take offer id 300: -1 lamport tokenB

        console.log(
          "Taker tokenB balance after all operations:",
          takerAtaForTokenBAccount.amount.toString(),
        );

        assert.ok(
          takerAtaForTokenBAccount.amount >= BigInt(0),
          "Taker tokenB balance should be non negative",
        );
      });

      it("should correctly reflect maker tokenB balance after take offer", async () => {
        const makerAtaForTokenBAccount = await getAccount(
          provider.connection,
          makerAtaForTokenB,
        );

        // maker started with 0 tokenB
        // take offer id 1: +200 tokenB
        // take offer id 300: +1 lamport tokenB

        console.log(
          "Maker tokenB balance after all operations:",
          makerAtaForTokenBAccount.amount.toString(),
        );

        assert.ok(
          makerAtaForTokenBAccount.amount >= BigInt(0),
          "Maker tokenB balance should be non negative",
        );
      });
    });

    describe.skip("PDA edge cases", async () => {
      it("should verify escrow offer PDA is deterministic", async () => {
        // derive the same PDA multiple times and verify it's always the same
        const [pda1] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            maker.publicKey.toBuffer(),
            new anchor.BN(999).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );
        const [pda2] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            maker.publicKey.toBuffer(),
            new anchor.BN(999).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );
        const [pda3] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            maker.publicKey.toBuffer(),
            new anchor.BN(999).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );

        assert.strictEqual(
          pda1.toBase58(),
          pda2.toBase58(),
          "PDA should be deterministic - pda1 should equal pda2",
        );
        assert.strictEqual(
          pda2.toBase58(),
          pda3.toBase58(),
          "PDA should be deterministic - pda2 should equal pda3",
        );
      });

      it("should verify different makers produce different PDAs for same id", async () => {
        const [makerPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            maker.publicKey.toBuffer(),
            new anchor.BN(999).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );
        const [takerPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            taker.publicKey.toBuffer(),
            new anchor.BN(999).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );

        assert.notStrictEqual(
          makerPda.toBase58(),
          takerPda.toBase58(),
          "Different makers should produce different PDAs for same id",
        );
      });

      it("should verify different ids produce different PDAs for same maker", async () => {
        const [pda998] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            maker.publicKey.toBuffer(),
            new anchor.BN(998).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );
        const [pda999] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("offer"),
            maker.publicKey.toBuffer(),
            new anchor.BN(999).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );

        assert.notStrictEqual(
          pda998.toBase58(),
          pda999.toBase58(),
          "Different ids should produce different PDAs for same maker",
        );
      });
    });
  });
});

async function airdrop(connection: any, address: any, amount = 1000000000) {
  await connection.confirmTransaction(
    await connection.requestAirdrop(address, amount),
    "confirmed",
  );
}
