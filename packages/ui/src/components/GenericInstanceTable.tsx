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
// import { Button } from "@/components/ui/button";
// import type { SidePanelState } from "@/types";

// export interface TableColumnDef {
//   key: string;
//   label: string;
//   width?: string;
//   render: (item: any) => ReactNode;
//   rowHighlight?: (item: any) => boolean;
// }

// interface GenericInstanceTableProps {
//   data: any[];
//   columns: TableColumnDef[];
//   onRowClick: (item: any) => Partial<SidePanelState>;
//   detailRoute?: (item: any) => string;
//   drawer: (data: Partial<SidePanelState>) => void;
//   children?: ReactNode;
//   getRowClassName?: (item: any) => string;
// }

// export const GenericInstanceTable = memo(
//   ({
//     data,
//     columns,
//     onRowClick,
//     detailRoute,
//     drawer,
//     children,
//     getRowClassName,
//   }: GenericInstanceTableProps) => {
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
//               <TableHead className="w-[100px]"></TableHead>
//             </TableRow>
//           </TableHeader>
//           <TableBody>
//             {data && data.length > 0 ? (
//               data.map((item: any, idx: number) => (
//                 <TableRow
//                   key={item.uuid || idx}
//                   className={getRowClassName?.(item) || ""}
//                 >
//                   {columns.map((col) => (
//                     <TableCell key={`${item.uuid || idx}-${col.key}`}>
//                       {col.render(item)}
//                     </TableCell>
//                   ))}
//                   <TableCell>
//                     <div className="flex items-center gap-2">
//                       <Button
//                         variant="outline"
//                         size="icon"
//                         onClick={() => {
//                           const panelData = onRowClick(item);
//                           drawer({
//                             isOpen: true,
//                             ...panelData,
//                           });
//                         }}
//                       >
//                         <ExternalLink className="h-4 w-4 text-muted-foreground" />
//                       </Button>
//                       {detailRoute && (
//                         <Link to={detailRoute(item)}>
//                           <Button variant="outline" size="icon">
//                             <ExternalLink className="h-4 w-4 text-muted-foreground" />
//                           </Button>
//                         </Link>
//                       )}
//                     </div>
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

// GenericInstanceTable.displayName = "GenericInstanceTable";
