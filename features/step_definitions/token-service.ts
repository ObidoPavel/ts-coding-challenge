import { Given, Then, When } from "@cucumber/cucumber";
import { accounts } from '../../src/config';
import {
  AccountBalanceQuery,
  AccountId,
  Client,
  PrivateKey,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TokenInfoQuery,
  TransferTransaction,
  TokenAssociateTransaction,
  TransactionId
} from "@hashgraph/sdk";
import assert from "node:assert";

const client = Client.forTestnet();

Given(/^A Hedera account with more than (\d+) hbar$/, async function (expectedBalance: number) {
  const account = accounts[0];
  const accountId = AccountId.fromString(account.id);
  const privateKey = PrivateKey.fromStringED25519(account.privateKey);

  this.accountId = accountId;
  this.accountPrivateKey = privateKey;
  client.setOperator(accountId, privateKey);

  const balance = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);

  const hbarBalance = balance.hbars.toBigNumber().toNumber();
  assert.ok(hbarBalance > expectedBalance, `Account balance ${hbarBalance} is not greater than ${expectedBalance}`);
});

When(/^I create a token named Test Token \(HTT\)$/, async function () {
  const transaction = await new TokenCreateTransaction()
    .setTokenName("Test Token")
    .setTokenSymbol("HTT")
    .setDecimals(2)
    .setInitialSupply(0)
    .setTreasuryAccountId(this.accountId)
    .setSupplyType(TokenSupplyType.Infinite)
    .setTokenType(TokenType.FungibleCommon)
    .setSupplyKey(this.accountPrivateKey.publicKey)
    .setAdminKey(this.accountPrivateKey.publicKey)
    .freezeWith(client);

  const txResponse = await transaction.execute(client);
  const receipt = await txResponse.getReceipt(client);
  this.tokenId = receipt.tokenId;
});

Then(/^The token has the name "([^"]*)"$/, async function (name: string) {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  assert.strictEqual(tokenInfo.name, name);
});

Then(/^The token has the symbol "([^"]*)"$/, async function (symbol: string) {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  assert.strictEqual(tokenInfo.symbol, symbol);
});

Then(/^The token has (\d+) decimals$/, async function (decimals: number) {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  assert.strictEqual(tokenInfo.decimals, decimals);
});

Then(/^The token is owned by the account$/, async function () {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  assert.ok(tokenInfo.treasuryAccountId, "Treasury account ID is null");
  assert.strictEqual(tokenInfo.treasuryAccountId!.toString(), this.accountId.toString());
});

Then(/^An attempt to mint (\d+) additional tokens succeeds$/, async function (amount: number) {
  const transaction = await new TokenMintTransaction()
    .setTokenId(this.tokenId)
    .setAmount(amount)
    .execute(client);
  await transaction.getReceipt(client);
});

When(/^I create a fixed supply token named Test Token \(HTT\) with (\d+) tokens$/, async function (initialSupply: number) {
  const transaction = await new TokenCreateTransaction()
    .setTokenName("Test Token")
    .setTokenSymbol("HTT")
    .setDecimals(2)
    .setInitialSupply(initialSupply)
    .setTreasuryAccountId(this.accountId)
    .setSupplyType(TokenSupplyType.Finite)
    .setTokenType(TokenType.FungibleCommon)
    .setMaxSupply(initialSupply)
    .setAdminKey(this.accountPrivateKey.publicKey)
    .freezeWith(client);

  const txResponse = await transaction.execute(client);
  const receipt = await txResponse.getReceipt(client);
  this.tokenId = receipt.tokenId;
});

Then(/^The total supply of the token is (\d+)$/, async function (supply: number) {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  assert.strictEqual(tokenInfo.totalSupply.toNumber(), supply);
});

Then(/^An attempt to mint tokens fails$/, async function () {
  try {
    const transaction = await new TokenMintTransaction()
      .setTokenId(this.tokenId)
      .setAmount(100)
      .execute(client);
    await transaction.getReceipt(client);
    assert.fail("Should not be able to mint tokens for fixed supply token");
  } catch (error: any) {
    assert.ok(error.toString().includes("TOKEN_HAS_NO_SUPPLY_KEY"));
  }
});

Given(/^A first hedera account with more than (\d+) hbar$/, async function (expectedBalance: number) {
  const account = accounts[1];
  const accountId = AccountId.fromString(account.id);
  const privateKey = PrivateKey.fromStringED25519(account.privateKey);

  this.firstAccountId = accountId;
  this.firstAccountPrivateKey = privateKey;
  client.setOperator(accountId, privateKey);

  const balance = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);

  const hbarBalance = balance.hbars.toBigNumber().toNumber();
  assert.ok(hbarBalance > expectedBalance, `Account balance ${hbarBalance} is not greater than ${expectedBalance}`);
});

Given(/^A second Hedera account$/, async function () {
  const account = accounts[2];
  this.secondAccountId = AccountId.fromString(account.id);
  this.secondAccountPrivateKey = PrivateKey.fromStringED25519(account.privateKey);
  client.setOperator(this.secondAccountId, this.secondAccountPrivateKey);
});

Given(/^A token named Test Token \(HTT\) with (\d+) tokens$/, { timeout: 30000 }, async function (initialSupply: number) {
  const account = accounts[0];
  const accountId = AccountId.fromString(account.id);
  const privateKey = PrivateKey.fromStringED25519(account.privateKey);

  this.accountId = accountId;
  this.accountPrivateKey = privateKey;
  client.setOperator(accountId, privateKey);

  const transaction = await new TokenCreateTransaction()
    .setTokenName("Test Token")
    .setTokenSymbol("HTT")
    .setDecimals(2)
    .setInitialSupply(initialSupply)
    .setTreasuryAccountId(accountId)
    .setSupplyType(TokenSupplyType.Infinite)
    .setTokenType(TokenType.FungibleCommon)
    .setSupplyKey(privateKey.publicKey)
    .setAdminKey(privateKey.publicKey)
    .freezeWith(client);

  const signedTx = await transaction.sign(privateKey);
  const txResponse = await signedTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  this.tokenId = receipt.tokenId;
  this.initialSupply = initialSupply;
});

async function ensureTokenAssociation(accountId: AccountId, privateKey: PrivateKey, tokenId: any) {
  try {
    const associateTransaction = await new TokenAssociateTransaction()
      .setAccountId(accountId)
      .setTokenIds([tokenId])
      .freezeWith(client);

    const signedTx = await associateTransaction.sign(privateKey);
    await signedTx.execute(client).then(resp => resp.getReceipt(client));
  } catch (error) {
    // Token might already be associated
  }
}

async function adjustTokenBalance(
  accountId: AccountId,
  privateKey: PrivateKey,
  tokenId: any,
  targetAmount: number,
  treasuryId: AccountId,
  treasuryKey: PrivateKey
) {
  const balance = await new AccountBalanceQuery().setAccountId(accountId).execute(client);
  const currentBalance = balance.tokens?.get(tokenId)?.toNumber() || 0;

  if (currentBalance === targetAmount) return;

  const diff = targetAmount - currentBalance;
  client.setOperator(treasuryId, treasuryKey);

  if (diff > 0) {
    const mintTx = await new TokenMintTransaction()
      .setTokenId(tokenId)
      .setAmount(diff)
      .freezeWith(client);

    await mintTx.sign(treasuryKey)
      .then(signed => signed.execute(client))
      .then(resp => resp.getReceipt(client));

    const transferTx = await new TransferTransaction()
      .addTokenTransfer(tokenId, treasuryId, -diff)
      .addTokenTransfer(tokenId, accountId, diff)
      .freezeWith(client);

    await transferTx.sign(treasuryKey)
      .then(signed => signed.execute(client))
      .then(resp => resp.getReceipt(client));
  } else {
    const transferTx = await new TransferTransaction()
      .addTokenTransfer(tokenId, accountId, diff)
      .addTokenTransfer(tokenId, treasuryId, -diff)
      .freezeWith(client);

    await transferTx.sign(privateKey)
      .then(signed => signed.execute(client))
      .then(resp => resp.getReceipt(client));
  }

  const finalBalance = await new AccountBalanceQuery().setAccountId(accountId).execute(client);
  const finalTokenBalance = finalBalance.tokens?.get(tokenId)?.toNumber() || 0;
  assert.strictEqual(finalTokenBalance, targetAmount);
}

Given(/^The first account holds (\d+) HTT tokens$/, { timeout: 30000 }, async function (amount: number) {
  await ensureTokenAssociation(this.firstAccountId, this.firstAccountPrivateKey, this.tokenId);
  await adjustTokenBalance(
    this.firstAccountId,
    this.firstAccountPrivateKey,
    this.tokenId,
    amount,
    this.accountId,
    this.accountPrivateKey
  );
});

Given(/^The second account holds (\d+) HTT tokens$/, { timeout: 30000 }, async function (amount: number) {
  await ensureTokenAssociation(this.secondAccountId, this.secondAccountPrivateKey, this.tokenId);
  await adjustTokenBalance(
    this.secondAccountId,
    this.secondAccountPrivateKey,
    this.tokenId,
    amount,
    this.accountId,
    this.accountPrivateKey
  );
});

When(/^The first account creates a transaction to transfer (\d+) HTT tokens to the second account$/, async function (amount: number) {
  const transactionId = TransactionId.generate(this.firstAccountId);

  this.transferTransaction = await new TransferTransaction()
    .addTokenTransfer(this.tokenId, this.firstAccountId, -amount)
    .addTokenTransfer(this.tokenId, this.secondAccountId, amount)
    .setTransactionId(transactionId)
    .setTransactionValidDuration(120)
    .setNodeAccountIds([new AccountId(3)])
    .freezeWith(client);
});

When(/^The first account submits the transaction$/, async function () {
  const signedTx1 = await this.transferTransaction.sign(this.firstAccountPrivateKey);
  const signedTx2 = await signedTx1.sign(this.secondAccountPrivateKey);
  const txResponse = await signedTx2.execute(client);
  await txResponse.getReceipt(client);
  this.lastTransactionResponse = txResponse;
});

When(/^The second account creates a transaction to transfer (\d+) HTT tokens to the first account$/, async function (amount: number) {
  const transactionId = TransactionId.generate(this.firstAccountId);

  this.transferTransaction = await new TransferTransaction()
    .addTokenTransfer(this.tokenId, this.secondAccountId, -amount)
    .addTokenTransfer(this.tokenId, this.firstAccountId, amount)
    .setTransactionId(transactionId)
    .setTransactionValidDuration(120)
    .setNodeAccountIds([new AccountId(3)])
    .freezeWith(client);

  const signedTx1 = await this.transferTransaction.sign(this.secondAccountPrivateKey);
  const signedTx2 = await signedTx1.sign(this.firstAccountPrivateKey);
  this.signedTransferTx = signedTx2;
});

Then(/^The first account has paid for the transaction fee$/, { timeout: 30000 }, async function () {
  await new Promise(resolve => setTimeout(resolve, 5000));
  const record = await this.lastTransactionResponse.getRecord(client);
  assert.ok(record.transactionFee.toTinybars() > 0, 'Transaction fee should be greater than 0');
});

Given(/^A first hedera account with more than (\d+) hbar and (\d+) HTT tokens$/, { timeout: 30000 }, async function (expectedBalance: number, tokenAmount: number) {
  const account = accounts[1];
  this.firstAccountId = AccountId.fromString(account.id);
  this.firstAccountPrivateKey = PrivateKey.fromStringED25519(account.privateKey);
  client.setOperator(this.firstAccountId, this.firstAccountPrivateKey);

  const balance = await new AccountBalanceQuery().setAccountId(this.firstAccountId).execute(client);
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);

  await ensureTokenAssociation(this.firstAccountId, this.firstAccountPrivateKey, this.tokenId);
  await adjustTokenBalance(
    this.firstAccountId,
    this.firstAccountPrivateKey,
    this.tokenId,
    tokenAmount,
    this.accountId,
    this.accountPrivateKey
  );
});

Given(/^A second Hedera account with (\d+) hbar and (\d+) HTT tokens$/, { timeout: 30000 }, async function (expectedBalance: number, tokenAmount: number) {
  const account = accounts[2];
  this.secondAccountId = AccountId.fromString(account.id);
  this.secondAccountPrivateKey = PrivateKey.fromStringED25519(account.privateKey);

  const balance = await new AccountBalanceQuery().setAccountId(this.secondAccountId).execute(client);
  assert.ok(balance.hbars.toBigNumber().toNumber() >= expectedBalance);

  await ensureTokenAssociation(this.secondAccountId, this.secondAccountPrivateKey, this.tokenId);
  await adjustTokenBalance(
    this.secondAccountId,
    this.secondAccountPrivateKey,
    this.tokenId,
    tokenAmount,
    this.accountId,
    this.accountPrivateKey
  );
});

Given(/^A third Hedera account with (\d+) hbar and (\d+) HTT tokens$/, { timeout: 30000 }, async function (expectedBalance: number, tokenAmount: number) {
  const account = accounts[3];
  this.thirdAccountId = AccountId.fromString(account.id);
  this.thirdAccountPrivateKey = PrivateKey.fromStringED25519(account.privateKey);

  const balance = await new AccountBalanceQuery().setAccountId(this.thirdAccountId).execute(client);
  assert.ok(balance.hbars.toBigNumber().toNumber() >= expectedBalance);

  await ensureTokenAssociation(this.thirdAccountId, this.thirdAccountPrivateKey, this.tokenId);
  await adjustTokenBalance(
    this.thirdAccountId,
    this.thirdAccountPrivateKey,
    this.tokenId,
    tokenAmount,
    this.accountId,
    this.accountPrivateKey
  );
});

Given(/^A fourth Hedera account with (\d+) hbar and (\d+) HTT tokens$/, { timeout: 30000 }, async function (expectedBalance: number, tokenAmount: number) {
  const account = accounts[4];
  this.fourthAccountId = AccountId.fromString(account.id);
  this.fourthAccountPrivateKey = PrivateKey.fromStringED25519(account.privateKey);

  const balance = await new AccountBalanceQuery().setAccountId(this.fourthAccountId).execute(client);
  assert.ok(balance.hbars.toBigNumber().toNumber() >= expectedBalance);

  await ensureTokenAssociation(this.fourthAccountId, this.fourthAccountPrivateKey, this.tokenId);
  await adjustTokenBalance(
    this.fourthAccountId,
    this.fourthAccountPrivateKey,
    this.tokenId,
    tokenAmount,
    this.accountId,
    this.accountPrivateKey
  );
});

When(/^A transaction is created to transfer (\d+) HTT tokens out of the first and second account and (\d+) HTT tokens into the third account and (\d+) HTT tokens into the fourth account$/, async function (amount1: number, amount2: number, amount3: number) {
  const transactionId = TransactionId.generate(this.firstAccountId);

  this.transferTransaction = await new TransferTransaction()
    .addTokenTransfer(this.tokenId, this.firstAccountId, -amount1)
    .addTokenTransfer(this.tokenId, this.secondAccountId, -amount1)
    .addTokenTransfer(this.tokenId, this.thirdAccountId, amount2)
    .addTokenTransfer(this.tokenId, this.fourthAccountId, amount3)
    .setTransactionId(transactionId)
    .setTransactionValidDuration(120)
    .setNodeAccountIds([new AccountId(3)])
    .freezeWith(client);
});

Then(/^The third account holds (\d+) HTT tokens$/, async function (amount: number) {
  const balance = await new AccountBalanceQuery().setAccountId(this.thirdAccountId).execute(client);
  assert.ok(balance.tokens, "Token balance map is null");
  assert.strictEqual(balance.tokens!.get(this.tokenId)?.toNumber(), amount);
});

Then(/^The fourth account holds (\d+) HTT tokens$/, async function (amount: number) {
  const balance = await new AccountBalanceQuery().setAccountId(this.fourthAccountId).execute(client);
  assert.ok(balance.tokens, "Token balance map is null");
  assert.strictEqual(balance.tokens!.get(this.tokenId)?.toNumber(), amount);
});
