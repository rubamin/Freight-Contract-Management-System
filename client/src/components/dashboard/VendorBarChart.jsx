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
} from "recharts";
import { useTheme } from "@mui/material/styles";
import PageCard from "../common/PageCard";
import { Typography, Box } from "@mui/material";

const VENDOR_COLORS = ["#22C55E", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

const VendorBarChart = ({ data = [], type = "bar", title = "Top Vendors by Invoice Count" }) => {
    const theme = useTheme();

    return (
        <Box sx={{ height: "100%", width: "100%" }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                {title}
            </Typography>

            {data.length === 0 ? (
                <Box sx={{ py: 6, textAlign: "center" }}>
                    <Typography color="text.secondary">No vendor data for this period.</Typography>
                </Box>
            ) : (
                <ResponsiveContainer width="100%" height={280}>
                    {type === "line" ? (
                        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="vendorName" tick={{ fontSize: 10 }} />
                            <YAxis allowDecimals={false} />
                            <Tooltip formatter={(value) => [value, "Invoices"]} />
                            <Line type="monotone" dataKey="count" stroke={theme.palette.success.main} strokeWidth={2} />
                        </LineChart>
                    ) : type === "pie" ? (
                        <PieChart>
                            <Tooltip formatter={(value) => [value, "Invoices"]} />
                            <Pie
                                data={data}
                                dataKey="count"
                                nameKey="vendorName"
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                label
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={VENDOR_COLORS[index % VENDOR_COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    ) : (
                        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis type="category" dataKey="vendorName" width={110} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value) => [value, "Invoices"]} />
                            <Bar dataKey="count" name="Invoices" fill={theme.palette.success.main} radius={[0, 6, 6, 0]} />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            )}
        </Box>
    );
};

export default VendorBarChart;