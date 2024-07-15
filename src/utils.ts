// Import the ERC20 smart contract class from generated files
import { Erc20 } from "../generated/Erc20/erc20";
// Import entities from the generated schema
import { Account, Token, TokenBalance } from "../generated/schema";
// Import data types from @graphprotocol/graph-ts
import { BigDecimal, ethereum, BigInt } from "@graphprotocol/graph-ts";

// Define a constant for the zero address (used to identify null or non-existent addresses)
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Fetch token details from the blockchain and store in the subgraph
export function fetchTokenDetails(event: ethereum.Event): Token | null {
  // Check if token details are already saved in the store
  let token = Token.load(event.address.toHex());
  if (!token) {
    // If token details are not available, create a new Token entity
    token = new Token(event.address.toHex());

    // Set default values for the token
    token.name = "N/A";
    token.symbol = "N/A";
    token.decimals = BigDecimal.fromString("0");

    // Bind the ERC20 contract to the token's address
    let erc20 = Erc20.bind(event.address);

    // Try to fetch the token's name
    let tokenName = erc20.try_name();
    if (!tokenName.reverted) {
      token.name = tokenName.value;
    }

    // Try to fetch the token's symbol
    let tokenSymbol = erc20.try_symbol();
    if (!tokenSymbol.reverted) {
      token.symbol = tokenSymbol.value;
    }

    // Try to fetch the token's decimals
    let tokenDecimal = erc20.try_decimals();
    if (!tokenDecimal.reverted) {
      token.decimals = BigDecimal.fromString(tokenDecimal.value.toString());
    }

    // Save the token details to the store
    token.save();
  }
  return token;
}

// Fetch account details from the subgraph
export function fetchAccount(address: string): Account | null {
  // Check if account details are already saved in the store
  let account = Account.load(address);
  if (!account) {
    // If account details are not available, create a new Account entity
    account = new Account(address);
    account.save();
  }
  return account;
}

// Update the token balance for a given account
export function updateTokenBalance(
  token: Token,
  account: Account,
  amount: BigInt
): void {
  // Do not update the balance for the zero address
  if (ZERO_ADDRESS == account.id) return;

  // Get the existing account balance or create a new one
  let accountBalance = getOrCreateAccountBalance(account, token);
  let balance = accountBalance.amount.plus(bigIntToBigDecimal(amount));

  // Update the account balance with the new amount
  accountBalance.amount = balance;
  accountBalance.save();
}

// Helper function to get or create an account balance
function getOrCreateAccountBalance(
  account: Account,
  token: Token
): TokenBalance {
  // Construct the unique ID for the TokenBalance entity
  let id = token.id + "-" + account.id;
  let tokenBalance = TokenBalance.load(id);

  // If balance is not already saved, create a new TokenBalance entity
  if (!tokenBalance) {
    tokenBalance = new TokenBalance(id);
    tokenBalance.account = account.id;
    tokenBalance.token = token.id;
    tokenBalance.amount = BigDecimal.fromString("0");

    tokenBalance.save();
  }

  return tokenBalance;
}

// Helper function to convert BigInt to BigDecimal
function bigIntToBigDecimal(quantity: BigInt, decimals: i32 = 18): BigDecimal {
  return quantity.divDecimal(
    BigInt.fromI32(10)
      .pow(decimals as u8)
      .toBigDecimal()
  );
}
