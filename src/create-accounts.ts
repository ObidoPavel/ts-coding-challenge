import { mainAccount } from "./config";
import { AccountCreateTransaction, AccountId, Client, PrivateKey } from "@hashgraph/sdk";

const client = Client.forTestnet();

async function main() {
  // Set up the main account as the payer
  const PAYER_ID = AccountId.fromString(mainAccount.id);
  const PAYER_KEY = PrivateKey.fromStringED25519(mainAccount.privateKey);
  client.setOperator(PAYER_ID, PAYER_KEY);

  for (let i = 0; i < 5; i++) {
    const newPrivateKey = PrivateKey.generate()
    const receipt = await (await new AccountCreateTransaction().setInitialBalance(100).setKey(newPrivateKey)
        .execute(client)).getReceipt(client)
    console.log(`{id: "${receipt.accountId}", privateKey: "${newPrivateKey}"},`)
  }
}

main().then(console.log).catch(console.error);
