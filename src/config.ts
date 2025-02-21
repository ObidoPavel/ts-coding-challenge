import dotenv from 'dotenv';

dotenv.config();

export interface Account {
  id: string;
  privateKey: string;
}

// Get the main account from environment variables
export const mainAccount: Account = {
  id: process.env.MY_ACCOUNT_ID || "",
  privateKey: process.env.MY_PRIVATE_KEY || ""
};

// Test accounts with 10+ HBAR balance each
export const accounts: Account[] = [
  { id: "0.0.5613562", privateKey: "302e020100300506032b657004220420574889151e846e902eeebbe8f248b304f0a70bd12e42bb1163dbaf4bf26fc0cd" },
  { id: "0.0.5613563", privateKey: "302e020100300506032b657004220420e362beab10425525818cf933936f51a382dc00968ee9ec7fed452a8d1924c87b" },
  { id: "0.0.5613564", privateKey: "302e020100300506032b65700422042046e8195739f2a2ace64a12ccce8ed08bc6cb5e2f519a0069c1b0962dab4d806c" },
  { id: "0.0.5613565", privateKey: "302e020100300506032b6570042204203ff6ed4596390797c90565d170bd32b34cd9fc1a96903cf758904611a5274652" },
  { id: "0.0.5613566", privateKey: "302e020100300506032b657004220420050c10f072f3e69c7b5ae9110fb7aabb6fdc69d3595258021ff19113660a358e" }
];

