/** @format */
import { Card, CardContent } from "@/components/ui/base/card";
import { StoreContext } from "@/store";
import { getDateFromPeriod, formatGraphDate } from "@/utils";
import { useContext } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip } from "recharts";

type Props = {
  data: object[];
  barData: {
    dataKey: string;
    stackId: string;
    fill: string;
    name?: string;
  }[];
};

export const CountGraph = ({ data, barData }: Props) => {
  const { state } = useContext(StoreContext);
  const period = state.period;

  const startDate = getDateFromPeriod(period);

  const currentDate = new Date();
  const formattedEndDate = formatGraphDate(currentDate);
  const formattedStartDate = formatGraphDate(startDate)

  return (
    <Card className="col-span-4 p-1 border-none shadow-none">
      <CardContent className="p-0">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              style={{ borderBottom: "1px solid #e0e0e0" }}
              data={data}
              margin={{
                top: 5,
                right: 5,
                left: -10,
                bottom: 0,
              }}
            >
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-sm border bg-background p-2 shadow-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {payload[0].payload.label}
                        </div>
                        {payload.map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm font-medium">
                              <span className="text-muted-foreground">
                                {item.name}: {item.value}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {barData.map((bar) => (
                <Bar
                  key={bar.stackId}
                  dataKey={bar.dataKey}
                  stackId="stack"
                  fill={bar.fill}
                  name={bar.name || bar.dataKey}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-4">
          <span>{formattedStartDate}</span>
          <span>{formattedEndDate}</span>
        </div>
      </CardContent>
    </Card>
  );
};
