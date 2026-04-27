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
