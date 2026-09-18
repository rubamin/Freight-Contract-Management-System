import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useTheme } from "@mui/material/styles";
import PageCard from "../common/PageCard";
import { Typography, Box } from "@mui/material";

// data: [{ statusId, statusName, count }]
const StatusPieChart = ({ data = [] }) => {
    const theme = useTheme();
    const sliceColors = [
        theme.palette.secondary.main,
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.error.main,
        theme.palette.primary.main,
        theme.palette.info.main,
    ];

    return (
        <PageCard sx={{ height: "100%" }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Status-wise Invoice Distribution
            </Typography>

            {data.length === 0 ? (
                <Box sx={{ py: 6, textAlign: "center" }}>
                    <Typography color="text.secondary">No invoice data for this period.</Typography>
                </Box>
            ) : (
                <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="count"
                            nameKey="statusName"
                            innerRadius={70}
                            outerRadius={110}
                            paddingAngle={2}
                        >
                            {data.map((entry, index) => (
                                <Cell key={entry.statusId ?? index} fill={sliceColors[index % sliceColors.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            )}
        </PageCard>
    );
};

export default StatusPieChart;
