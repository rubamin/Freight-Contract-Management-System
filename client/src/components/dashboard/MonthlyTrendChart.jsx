import React from "react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";
import { useTheme } from "@mui/material/styles";
import { Typography, Box } from "@mui/material";

const CHART_COLORS = ["#3B82F6", "#EF4444", "#22C55E", "#F59E0B", "#8B5CF6"];

const MonthlyTrendChart = ({ data = [], type = "bar", title = "Monthly Invoice Trend" }) => {
    const theme = useTheme();

    // Check if data contains multi-metrics (e.g. combined invoices & discrepancies)
    const hasMultipleMetrics = data.length > 0 && ("invoices" in data[0] || "discrepancies" in data[0]);

    return (
        <Box sx={{ height: "100%", width: "100%" }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                {title}
            </Typography>

            {data.length === 0 ? (
                <Box sx={{ py: 6, textAlign: "center" }}>
                    <Typography color="text.secondary">No data for this period.</Typography>
                </Box>
            ) : (
                <ResponsiveContainer width="100%" height={280}>
                    {type === "line" ? (
                        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            {hasMultipleMetrics ? (
                                <>
                                    <Line type="monotone" dataKey="invoices" name="Invoices" stroke={theme.palette.primary.main} strokeWidth={2} />
                                    <Line type="monotone" dataKey="discrepancies" name="Discrepancies" stroke={theme.palette.error.main} strokeWidth={2} />
                                </>
                            ) : (
                                <Line type="monotone" dataKey="count" name="Count" stroke={theme.palette.primary.main} strokeWidth={2} />
                            )}
                        </LineChart>
                    ) : type === "pie" ? (
                        <PieChart>
                            <Tooltip />
                            <Pie
                                data={data}
                                dataKey={hasMultipleMetrics ? "invoices" : "count"}
                                nameKey="month"
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                label
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    ) : (
                        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            {hasMultipleMetrics ? (
                                <>
                                    <Bar dataKey="invoices" name="Invoices" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="discrepancies" name="Discrepancies" fill={theme.palette.error.main} radius={[4, 4, 0, 0]} />
                                </>
                            ) : (
                                <Bar dataKey="count" name="Count" fill={theme.palette.primary.main} radius={[6, 6, 0, 0]} />
                            )}
                        </BarChart>
                    )}
                </ResponsiveContainer>
            )}
        </Box>
    );
};

export default MonthlyTrendChart;