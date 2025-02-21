import { Given, Then, When } from "@cucumber/cucumber";
import {
  AccountBalanceQuery,
  AccountId,
  Client,
  PrivateKey,
  TopicCreateTransaction,
  TopicInfoQuery,
  TopicMessageSubmitTransaction,
  KeyList,
  Status
} from "@hashgraph/sdk";
import { accounts } from "../../src/config";
import assert from "node:assert";

// Pre-configured client for test network (testnet)
const client = Client.forTestnet();

// Configure mirror network
client.setMirrorNetwork([
  "hcs.testnet.mirrornode.hedera.com:5600"
]);

//Set the operator with the account ID and private key

Given(/^a first account with more than (\d+) hbars$/, async function (expectedBalance: number) {
  const account = accounts[0];
  this.accountId = AccountId.fromString(account.id);
  this.firstAccountPrivateKey = PrivateKey.fromStringED25519(account.privateKey);
  client.setOperator(this.accountId, this.firstAccountPrivateKey);

  const balance = await new AccountBalanceQuery()
    .setAccountId(this.accountId)
    .execute(client);

  const hbarBalance = balance.hbars.toBigNumber().toNumber();
  assert.ok(hbarBalance > expectedBalance, `Account balance ${hbarBalance} is not greater than ${expectedBalance}`);
});

When(/^A topic is created with the memo "([^"]*)" with the first account as the submit key$/, async function (memo: string) {
  const transaction = await new TopicCreateTransaction()
    .setTopicMemo(memo)
    .setSubmitKey(this.firstAccountPrivateKey.publicKey)
    .freezeWith(client);

  const txResponse = await transaction.execute(client);
  const receipt = await txResponse.getReceipt(client);
  this.topicId = receipt.topicId;
});

When(/^The message "([^"]*)" is published to the topic$/, async function (message: string) {
  const transaction = await new TopicMessageSubmitTransaction()
    .setTopicId(this.topicId)
    .setMessage(message)
    .execute(client);

  await transaction.getReceipt(client);
  this.lastMessageTxResponse = transaction;
  this.submittedMessage = message;
});

Then(/^The message "([^"]*)" is received by the topic and can be printed to the console$/, { timeout: 30000 }, async function (message: string) {
  const record = await this.lastMessageTxResponse.getRecord(client);
  assert.strictEqual(record.receipt.status, Status.Success, 'Message submission failed');

  await new Promise(resolve => setTimeout(resolve, 10000));
  const topicInfo = await new TopicInfoQuery()
    .setTopicId(this.topicId)
    .execute(client);

  assert.ok(topicInfo.sequenceNumber.toNumber() > 0, 'Topic should have at least one message');
});

Given(/^A second account with more than (\d+) hbars$/, async function (expectedBalance: number) {
  const account = accounts[1];
  this.accountId = AccountId.fromString(account.id);
  this.secondAccountPrivateKey = PrivateKey.fromStringED25519(account.privateKey);
  client.setOperator(this.accountId, this.secondAccountPrivateKey);

  const balance = await new AccountBalanceQuery()
    .setAccountId(this.accountId)
    .execute(client);

  const hbarBalance = balance.hbars.toBigNumber().toNumber();
  assert.ok(hbarBalance > expectedBalance, `Account balance ${hbarBalance} is not greater than ${expectedBalance}`);
});

Given(/^A (\d+) of (\d+) threshold key with the first and second account$/, async function (threshold: number, total: number) {
  this.thresholdKey = new KeyList(
    [this.firstAccountPrivateKey.publicKey, this.secondAccountPrivateKey.publicKey],
    threshold
  );
});

When(/^A topic is created with the memo "([^"]*)" with the threshold key as the submit key$/, { timeout: 30000 }, async function (memo: string) {
  const transaction = await new TopicCreateTransaction()
    .setTopicMemo(memo)
    .setSubmitKey(this.thresholdKey)
    .freezeWith(client);

  const signedTx = await transaction.sign(this.firstAccountPrivateKey);
  const txResponse = await signedTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  this.topicId = receipt.topicId;

  await new Promise(resolve => setTimeout(resolve, 5000));
});
