import { NextResponse } from 'next/server';

/**
 * Custom JSON replacer that converts BigInt to string
 */
function bigIntReplacer(key: string, value: any): any {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

/**
 * Wrapper for NextResponse.json() that handles BigInt serialization
 */
export function jsonResponse(data: any, init?: ResponseInit) {
  // Stringify with BigInt replacer, then parse back to ensure proper JSON
  const jsonString = JSON.stringify(data, bigIntReplacer);
  const parsedData = JSON.parse(jsonString);

  return NextResponse.json(parsedData, init);
}
