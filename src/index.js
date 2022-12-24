import { message } from "./target-1";
console.log(message);

import { thing } from "#made-up-package";
console.log(thing);

import { stuff } from "my-virtual-package";
console.log(stuff);

import co from "co";
console.log(`we got co ${co}`);
