// /** @format */

// import { ReactNode, memo } from "react";
// import { Link } from "react-router";
// import { ExternalLink } from "lucide-react";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";

// export interface GroupTableColumnDef {
//   key: string;
//   label: string;
//   width?: string;
//   render: (item: any) => ReactNode;
// }

// interface GenericGroupTableProps {
//   data: any[];
//   columns: GroupTableColumnDef[];
//   detailRoute: (item: any) => string;
//   children?: ReactNode;
//   getRowClassName?: (item: any) => string;
// }

// export const GenericGroupTable = memo(
//   ({
//     data,
//     columns,
//     detailRoute,
//     children,
//     getRowClassName,
//   }: GenericGroupTableProps) => {
//     return (
//       <div className="rounded-md border">
//         <Table>
//           <TableHeader>
//             <TableRow>
//               {columns.map((col) => (
//                 <TableHead key={col.key} style={{ width: col.width }}>
//                   {col.label}
//                 </TableHead>
//               ))}
//               <TableHead className="w-[50px]"></TableHead>
//             </TableRow>
//           </TableHeader>
//           <TableBody>
//             {data && data.length > 0 ? (
//               data.map((item: any, idx: number) => (
//                 <TableRow
//                   key={item.name || item.route || idx}
//                   className={getRowClassName?.(item) || ""}
//                 >
//                   {columns.map((col) => (
//                     <TableCell
//                       key={`${item.name || item.route || idx}-${col.key}`}
//                     >
//                       {col.render(item)}
//                     </TableCell>
//                   ))}
//                   <TableCell>
//                     <Link
//                       to={detailRoute(item)}
//                       className="inline-flex items-center justify-center h-8 w-8 rounded-md border hover:bg-muted"
//                     >
//                       <ExternalLink className="h-4 w-4 text-muted-foreground" />
//                     </Link>
//                   </TableCell>
//                 </TableRow>
//               ))
//             ) : (
//               <TableRow>
//                 <TableCell
//                   colSpan={columns.length + 1}
//                   className="text-center py-8 text-muted-foreground"
//                 >
//                   No data available
//                 </TableCell>
//               </TableRow>
//             )}
//           </TableBody>
//         </Table>
//         {children}
//       </div>
//     );
//   },
// );

// GenericGroupTable.displayName = "GenericGroupTable";
