import { up as mysql2Up, down as mysql2Down } from "./mysql2";
import { up as mongodbUp, down as mongodbDown } from "./mongodb";
import { up as prismaUp, down as prismaDown } from "./prisma";

export { mysql2Up, mysql2Down, mongodbUp, mongodbDown, prismaUp, prismaDown };
