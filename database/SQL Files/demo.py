import pandas as pd
import numpy as np

columns_list = [
    "GST NO", "Invoice / Bill No", "VendorGSTID", "Invoice / Bill Date", 
    "LR NO", "Vehicle No", "From", "To", "Actual Weight in MT", 
    "Freight Charge", "Detain Charge", "Extra Charge", "Total", "Remarks"
]

destinations = ["AHMEDABAD", "BHARUCH", "DAHEJ", "DAMAN", "DELHI", "BHANDUP", "BHIWANDI", "CHAKAN (PUNE)", "BADDI (SOLAN)", "INVALID_DEST"]
weights = [5.0, 10.0, 25.0, 6.5, 2.5]
gsts = ["24AJXPG3562F2Z1", "27AJXPG3562F2Z1", "08AJXPG3562F2Z1"]

np.random.seed(42)
rows_data = []
for i in range(1, 26):
    gst = np.random.choice(gsts)
    inv = f"INV-20{i:02d}"
    date = f"2025-0{np.random.randint(4, 9)}-{np.random.randint(10, 28)}"
    lr = f"LR-{900+i}"
    veh = f"GJ0{i%9+1}AB{1000+i}"
    frm = "HALOL"
    to_dest = np.random.choice(destinations)
    wt = np.random.choice(weights)
    
    base_freight = 10000 if to_dest == "DAMAN" else (7200 if to_dest == "AHMEDABAD" else (10500 if to_dest == "DAHEJ" else 30000))
    freight = base_freight if i % 2 == 0 else base_freight + np.random.randint(2000, 8000)
    detain = 500 if i % 5 == 0 else 0
    extra = 200 if i % 7 == 0 else 0
    total = freight + detain + extra
    remarks = f"Test validation row {i}"
    
    rows_data.append([gst, inv, "", date, lr, veh, frm, to_dest, wt, freight, detain, extra, total, remarks])

df_test = pd.DataFrame(rows_data, columns=columns_list)
df_test.to_excel("Test_Invoice_Upload_25_Rows.xlsx", index=False)
print("Test_Invoice_Upload_25_Rows.xlsx generated successfully!")