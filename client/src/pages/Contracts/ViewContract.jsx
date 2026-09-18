import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Divider,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  TextField,
  Tabs,
  Tab,
} from "@mui/material";
import { ArrowBack, Edit, Description, TableChart, Search } from "@mui/icons-material";
import axios from "axios";

import LoadingOverlay from "../../components/common/LoadingOverlay";

const statusColors = {
  DRAFT: "default",
  ACTIVE: "success",
  EXPIRED: "warning",
  CANCELLED: "error",
};

const ViewContract = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tab & Matrix View State
  const [activeTab, setActiveTab] = useState(0);
  const [sheet1Destinations, setSheet1Destinations] = useState([]);
  const [sheet1Weights, setSheet1Weights] = useState([]);
  const [sheet2Rows, setSheet2Rows] = useState([]);

  // Search & Pagination States for Sheet 1 & Sheet 2
  const [searchQuery1, setSearchQuery1] = useState("");
  const [page1, setPage1] = useState(0);
  const [rowsPerPage1, setRowsPerPage1] = useState(10);

  const [searchQuery2, setSearchQuery2] = useState("");
  const [page2, setPage2] = useState(0);
  const [rowsPerPage2, setRowsPerPage2] = useState(10);

  useEffect(() => {
    const fetchContractDetails = async () => {
      try {
        let token = "";
        const authDataStr = localStorage.getItem("freight_contract_auth");
        
        if (authDataStr) {
          try {
            const parsedAuth = JSON.parse(authDataStr);
            token = parsedAuth.token;
          } catch (e) {
            console.error("Failed parsing auth storage item context", e);
          }
        }

        const response = await axios.get(`http://localhost:5000/api/contracts/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const contractData = response.data.data;
        setContract(contractData);

        // --- Process Rate Matrix Data for Sheet 1 and Sheet 2 ---
        const matrixData = contractData?.rateMatrix || contractData?.RateMatrix || contractData?.matrix || [];
        
        if (Array.isArray(matrixData) && matrixData.length > 0) {
          // --- Process Sheet 1 Data ---
          const sheet1RawData = matrixData.filter((row) => {
            const wId = row.WeightID !== undefined ? row.WeightID : row.weightID;
            const vId = row.VehicleTypeID !== undefined ? row.VehicleTypeID : row.vehicleTypeID;
            return (wId !== null && wId !== undefined && wId !== "") || (vId === null || vId === undefined);
          });

          if (sheet1RawData.length > 0) {
            const uniqueWeights = Array.from(
              new Set(
                sheet1RawData
                  .map((row) => {
                    const w = row.weight || row.Weight;
                    if (w && (w.Weight !== undefined || w.weight !== undefined)) {
                      const value = w.Weight !== undefined ? w.Weight : w.weight;
                      return `${value} ${w.WeightUnit || "MT"}`.trim();
                    }
                    return row.WeightID ? `Weight ID ${row.WeightID}` : "Standard Rate";
                  })
                  .filter(Boolean)
              )
            );

            const cityMap = {};
            sheet1RawData.forEach((row) => {
              const destObj = row.destination || row.Destination;
              const cityName = destObj?.City || destObj?.city || `Destination ${row.DestinationID || row.destinationID || "N/A"}`;
              
              const w = row.weight || row.Weight;
              const weightLabel = (w && (w.Weight !== undefined || w.weight !== undefined)) 
                ? `${w.Weight !== undefined ? w.Weight : w.weight} ${w.WeightUnit || "MT"}`.trim() 
                : (row.WeightID ? `Weight ID ${row.WeightID}` : "Standard Rate");

              if (!cityMap[cityName]) {
                const distanceKm = row.DistanceKM !== undefined ? row.DistanceKM : row.distanceKM;
                cityMap[cityName] = {
                  cityName,
                  distanceKm: distanceKm !== undefined && distanceKm !== null ? distanceKm : "",
                  rates: {}
                };
              }
              cityMap[cityName].rates[weightLabel] = {
                RateID: row.RateID !== undefined ? row.RateID : row.rateID,
                BaseRate: row.BaseRate !== undefined ? row.BaseRate : row.baseRate || ""
              };
            });

            setSheet1Weights(uniqueWeights);
            setSheet1Destinations(Object.values(cityMap));
          }

          // --- Process Sheet 2 Data ---
          const s2Rows = matrixData.filter((r) => {
            const vId = r.VehicleTypeID !== undefined ? r.VehicleTypeID : r.vehicleTypeID;
            return vId !== null && vId !== undefined && vId !== "";
          });
          setSheet2Rows(s2Rows);
        }

      } catch (error) {
        console.error("Error fetching contract profiles:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchContractDetails();
  }, [id]);

  const filteredSheet1 = sheet1Destinations.filter((dest) =>
    dest.cityName.toLowerCase().includes(searchQuery1.toLowerCase())
  );

  const filteredSheet2 = sheet2Rows.filter((row) => {
    const destObj = row.destination || row.Destination;
    const vehicleObj = row.vehicleType || row.VehicleType;
    const cityName = destObj?.City || destObj?.city || "";
    const vehicleName = vehicleObj?.VehicleName || vehicleObj?.vehicleName || "";
    return (
      cityName.toLowerCase().includes(searchQuery2.toLowerCase()) ||
      vehicleName.toLowerCase().includes(searchQuery2.toLowerCase())
    );
  });

  if (loading) {
    return <LoadingOverlay open={true} message="Loading Contract Details..." />;
  }

  if (!contract) {
    return (
      <Box p={3} sx={{ maxWidth: "900px", margin: "0 auto" }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate("/contracts")} sx={{ mb: 2 }}>
          Back to list
        </Button>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="error" variant="h6">Contract record could not be loaded or does not exist.</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box p={3} sx={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Action Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate("/contracts")}>
          Back to Summary
        </Button>
        <Button
          variant="contained"
          color="warning"
          startIcon={<Edit />}
          onClick={() => navigate(`/contracts/edit/${id}`)}
        >
          Modify Contract
        </Button>
      </Box>

      {/* Main Structural Specifications Details */}
      <Card sx={{ mb: 3, boxShadow: 2, borderRadius: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Description color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Contract Information ({contract.ContractNo})
            </Typography>
            <Box sx={{ ml: "auto" }}>
              <Chip
                label={contract.Status || "DRAFT"}
                color={statusColors[String(contract.Status).toUpperCase()] || "default"}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Box>
          <Divider sx={{ mb: 4 }} />

          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="textSecondary" display="block">Vendor Details</Typography>
              <Typography variant="body1" fontWeight={500}>{contract.vendor?.VendorName || "-"}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="textSecondary" display="block">Vendor PAN Profile</Typography>
              <Typography variant="body1" fontWeight={500}>{contract.VendorPAN || "-"}</Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="textSecondary" display="block">Validity Commenced From</Typography>
              <Typography variant="body1" fontWeight={500}>{contract.ContractStartDate || "-"}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="textSecondary" display="block">Validity Termination Date</Typography>
              <Typography variant="body1" fontWeight={500}>{contract.ContractEndDate || "-"}</Typography>
            </Grid>

            {contract.RateMatrixFileName && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="caption" color="textSecondary" display="block">
                  Associated Rate Matrix Grid Template
                </Typography>
                <Chip
                  icon={<TableChart />}
                  label={contract.RateMatrixFileName}
                  variant="outlined"
                  size="small"
                  color="info"
                  sx={{ mt: 1 }}
                />
              </Grid>
            )}

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="textSecondary" display="block">Remarks / Operational Notes</Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}>
                {contract.Remarks || "No specific dynamic internal descriptors saved."}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Contract Rate Matrix Sheets Preview Section */}
      <Card sx={{ mb: 3, boxShadow: 2, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Contract Rate Matrix Preview
          </Typography>

          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
            <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
              <Tab label={`Sheet 1: Domestic Destinations (${sheet1Destinations.length})`} />
              <Tab label={`Sheet 2: Additional Destinations (${sheet2Rows.length})`} />
            </Tabs>
          </Box>

          {/* Sheet 1: Domestic Destinations Table with Horizontal Scrolling & Search */}
          {activeTab === 0 && (
            <Box>
              <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
                <TextField
                  size="small"
                  placeholder="Find destination city..."
                  value={searchQuery1}
                  onChange={(e) => { setSearchQuery1(e.target.value); setPage1(0); }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ width: "260px" }}
                />
              </Box>

              <Box 
                sx={{ 
                  width: "100%", 
                  overflowX: "auto", 
                  overflowY: "hidden",
                  display: "block",
                  "&::-webkit-scrollbar": { height: 8 },
                  "&::-webkit-scrollbar-thumb": { backgroundColor: "#bdbdbd", borderRadius: 4 }
                }}
              >
                <TableContainer component={Paper} sx={{ border: "1px solid #e0e0e0", maxHeight: 500, boxShadow: "none" }}>
                  <Table stickyHeader size="small" sx={{ minWidth: Math.max(700, sheet1Weights.length * 100 + 240) }}>
                    <TableHead>
                      <TableRow>
                        <TableCell 
                          sx={{ 
                            fontWeight: "bold", 
                            bgcolor: "#f5f5f5", 
                            minWidth: 160,
                            maxWidth: 160,
                            position: "sticky", 
                            left: 0, 
                            zIndex: 3,
                            borderRight: "1px solid #e0e0e0"
                          }}
                        >
                          DESTINATION
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: "bold", bgcolor: "#e2e8f0", minWidth: 80 }}>
                          KM
                        </TableCell>
                        {sheet1Weights.map((weight) => (
                          <TableCell key={weight} align="center" sx={{ fontWeight: "bold", bgcolor: "#e2e8f0", minWidth: 100 }}>
                            {weight}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredSheet1
                        .slice(page1 * rowsPerPage1, page1 * rowsPerPage1 + rowsPerPage1)
                        .map((dest) => (
                          <TableRow key={dest.cityName} hover>
                            <TableCell 
                              sx={{ 
                                fontWeight: 500, 
                                bgcolor: "#ffffff", 
                                position: "sticky", 
                                left: 0, 
                                zIndex: 2, 
                                minWidth: 160,
                                maxWidth: 160,
                                borderRight: "1px solid #e0e0e0",
                                boxShadow: "2px 0 5px rgba(0,0,0,0.05)" 
                              }}
                            >
                              {dest.cityName}
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 80 }}>
                              <Typography variant="body2">{dest.distanceKm !== undefined && dest.distanceKm !== "" ? dest.distanceKm : "-"}</Typography>
                            </TableCell>
                            {sheet1Weights.map((weight) => {
                              const cellData = dest.rates[weight] || {};
                              return (
                                <TableCell key={weight} align="center" sx={{ minWidth: 100 }}>
                                  <Typography variant="body2">{cellData.BaseRate !== undefined && cellData.BaseRate !== "" ? cellData.BaseRate : "-"}</Typography>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      {filteredSheet1.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={sheet1Weights.length + 2} align="center">
                            No matching destination records found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <TablePagination
                component="div"
                count={filteredSheet1.length}
                page={page1}
                onPageChange={(e, newPage) => setPage1(newPage)}
                rowsPerPage={rowsPerPage1}
                onRowsPerPageChange={(e) => { setRowsPerPage1(parseInt(e.target.value, 10)); setPage1(0); }}
                rowsPerPageOptions={[10, 25, 50]}
              />
            </Box>
          )}

          {/* Sheet 2: Additional Destinations with Search and Pagination */}
          {activeTab === 1 && (
            <Box>
              <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
                <TextField
                  size="small"
                  placeholder="Find destination or vehicle..."
                  value={searchQuery2}
                  onChange={(e) => { setSearchQuery2(e.target.value); setPage2(0); }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ width: "260px" }}
                />
              </Box>

              <TableContainer component={Paper} sx={{ border: "1px solid #e0e0e0", maxHeight: 500 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Destination City</TableCell>
                      <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Vehicle Type / ODC Details</TableCell>
                      <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Freight (INR)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSheet2
                      .slice(page2 * rowsPerPage2, page2 * rowsPerPage2 + rowsPerPage2)
                      .map((row) => {
                        const destObj = row.destination || row.Destination;
                        const vehicleObj = row.vehicleType || row.VehicleType;
                        const cityName = destObj?.City || destObj?.city || `Destination ${row.DestinationID || row.destinationID}`;
                        const vehicleName = vehicleObj?.VehicleName || vehicleObj?.vehicleName || `Vehicle ${row.VehicleTypeID || row.vehicleTypeID}`;
                        const rateId = row.RateID !== undefined ? row.RateID : row.rateID;

                        return (
                          <TableRow key={rateId} hover>
                            <TableCell>{cityName}</TableCell>
                            <TableCell>{vehicleName}</TableCell>
                            <TableCell>{row.BaseRate !== undefined ? row.BaseRate : row.baseRate || "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    {filteredSheet2.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">No matching additional destination records found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={filteredSheet2.length}
                page={page2}
                onPageChange={(e, newPage) => setPage2(newPage)}
                rowsPerPage={rowsPerPage2}
                onRowsPerPageChange={(e) => { setRowsPerPage2(parseInt(e.target.value, 10)); setPage2(0); }}
                rowsPerPageOptions={[10, 25, 50]}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ViewContract;