import fs from 'fs';
import path from "path";

export const projectRoot = process.cwd();

export function getToken() {
  const filePath = path.join(projectRoot, '_token.txt');
  const token = fs.readFileSync(filePath, 'utf8');
  return token.trim();
}


export const TAXA = 0.06