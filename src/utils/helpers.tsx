// I really don't like having a helpers file. It typically means you haven't 
// thought hard enough about where functions should live. But it will do for
// now. 

// Truncate a number to a fixed number of decimal places 
export const toFixedTrunc = (num: number, fixed: number) => {
  const re = new RegExp('^-?\\d+(?:\.\\d{0,' + (fixed || -1) + '})?');
  const result = num.toString().match(re)
  if (!result) {
    throw new Error(`Failed to truncate number ${num} to ${fixed} decimal places`);
  }
  return result[0];
}

// TODO: replace with proper currency formatting https://www.npmjs.com/package/react-currency-format
export const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) {
    return "";
  }
  const amountString = toFixedTrunc(amount, 2);

  return amount < 0 ? `-$${amountString.substring(1)}` : `$${amountString}`;
}

// wraps formatCurrency in an element with color
export const formatBalance = (balance: number | undefined | null) => {
  if (balance === undefined || balance === null) {
    return <span>-</span>;
  }
  const balanceString = formatCurrency(balance);

  if (balance < 0) {
    return (
      <span className={'text-red-500'}>
        {balanceString}
      </span>
    );
  }
  else {
    return (
      <span>
        {balanceString}
      </span>
    );
  }
}
