/** @format */

import { ReactNode, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { SidePanelState } from "@/hooks/useIndexTableData";

export interface ColumnConfig {
  key: string;
  label: string;
  render?: (value: any, row: any) => ReactNode;
  className?: string;
  headerClassName?: string;
  width?: string;
}

interface GenericTableProps {
  columns: ColumnConfig[];
  data: any[];
  onRowClick?: (row: any) => void;
  setDrawer?: (data: Partial<SidePanelState>) => void;
  children?: ReactNode;
  emptyMessage?: string;
}

export function GenericTable({
  columns,
  data,
  onRowClick,
  setDrawer,
  children,
  emptyMessage = "No data available",
}: GenericTableProps) {
  const isEmpty = useMemo(() => !data || data.length === 0, [data]);

  return (
    <div className="space-y-2">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`${col.headerClassName || ""}`}
                  style={{
                    width: col.width,
                  }}
                >
                  {col.label}
                </TableHead>
              ))}
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isEmpty ? (
              data.map((row, idx) => (
                <TableRow
                  key={idx}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    onRowClick?.(row);
                    setDrawer?.({
                      isOpen: true,
                      //@ts-ignore
                      modelName: row.name,
                      modelKey: row.name,
                      currentEntry: row,
                    });
                  }}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={`${idx}-${col.key}`}
                      className={col.className}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : (row[col.key] ?? "-")}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="text-center text-muted-foreground py-8"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {children}
    </div>
  );
}
