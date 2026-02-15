// /** @format */

// import { ReactNode, useState } from "react";
// import SidePanel from "@/components/ui/side-panel";
// import { createPortal } from "react-dom";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
// import { ArrowUpDown } from "lucide-react";
// import { useIndexTableData } from "@/hooks/useIndexTableData";
// import type { SidePanelState } from "@/types";

// interface GenericScreenIndexProps {
//   resourceType: string;
//   defaultInstanceStatusType?: string;
//   pluralName: string;
//   singularName: string;
//   instanceTableComponent: React.ComponentType<any>;
//   groupTableComponent: React.ComponentType<any>;
//   renderToggles?: (props: {
//     modelKey: string;
//     instanceStatusType: string;
//     setInstanceStatusType: (value: string) => void;
//   }) => ReactNode;
//   sidePanelRenderer?: (state: SidePanelState) => ReactNode;
// }

// export function GenericScreenIndex({
//   resourceType,
//   defaultInstanceStatusType = "all",
//   pluralName,
//   singularName,
//   instanceTableComponent: InstanceTableComponent,
//   groupTableComponent: GroupTableComponent,
//   renderToggles,
//   sidePanelRenderer,
// }: GenericScreenIndexProps) {
//   const {
//     instanceData,
//     groupData,
//     instanceDataCount,
//     groupDataCount,
//     index,
//     instanceStatusType,
//     inputValue,
//     sidePanelData,
//     modelKey,
//     message,
//     drawer,
//     setInstanceStatusType,
//     setInputValue,
//     loadData,
//   } = useIndexTableData({
//     key: resourceType,
//     defaultInstanceStatusType,
//   });

//   const Table =
//     index === "instance" ? InstanceTableComponent : GroupTableComponent;

//   return (
//     <div className="relative">
//       {sidePanelRenderer && (
//         <>
//           {sidePanelRenderer(sidePanelData)}
//           {createPortal(
//             <SidePanel isOpen={sidePanelData.isOpen} />,
//             document.body,
//           )}
//         </>
//       )}

//       <div className="flex items-center justify-between mb-6">
//         <div className="flex items-center gap-2">
//           <ArrowUpDown className="h-5 w-5 text-muted-foreground" />
//           <span className="font-medium text-black dark:text-white">
//             {index === "instance" ? instanceDataCount : groupDataCount}{" "}
//             {index === "instance" ? singularName : `${singularName} Group`}
//             {(index === "instance"
//               ? parseFloat(instanceDataCount)
//               : parseFloat(groupDataCount)) > 1
//               ? "s"
//               : ""}
//           </span>
//           {!modelKey && (
//             <div className="flex px-4 grow">
//               <Input
//                 placeholder={`Search ${index === "instance" ? pluralName.toLowerCase() : `${singularName.toLowerCase()} groups`}`}
//                 value={inputValue}
//                 onChange={(e) => setInputValue(e.target.value)}
//                 className="w-[300px] text-muted-foreground"
//               />
//             </div>
//           )}
//         </div>
//         {renderToggles &&
//           renderToggles({
//             modelKey,
//             instanceStatusType,
//             setInstanceStatusType,
//           })}
//       </div>

//       <Table
//         data={index === "instance" ? instanceData : groupData}
//         drawer={drawer}
//       >
//         <div className="flex justify-center my-2">
//           {message ? (
//             <Button
//               variant="outline"
//               onClick={() =>
//                 loadData({
//                   offset: 0,
//                   limit: 20,
//                   index: index as any,
//                 })
//               }
//             >
//               {message}
//             </Button>
//           ) : null}
//         </div>
//       </Table>
//     </div>
//   );
// }
