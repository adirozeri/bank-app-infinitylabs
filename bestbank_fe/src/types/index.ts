export interface User {
  email: string;
  phone: string;
  balance: number;
}

export interface Transaction {
  counterpartEmail: string;
  amount: number;
  timestamp: string;
}

export interface Account {
  email: string;
  token: string;
}
