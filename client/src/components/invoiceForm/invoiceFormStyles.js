// Layout values shared by the Add Invoice and Edit Invoice card layouts.

export const CELL_INPUT_STYLE = { padding: '6px 8px', fontSize: '0.82rem' };

// Fields per line on desktop: 3 while the sidebar is expanded, 4 when it
// is collapsed (more room). Tablets get 2 and phones 1, so a whole invoice
// is filled without horizontal scrolling.
const EXPANDED_SIDEBAR_COLUMNS = 3;
const COLLAPSED_SIDEBAR_COLUMNS = 4;

export const getInvoiceFieldGridSx = (isSidebarCollapsed) => ({
    display: 'grid',
    gridTemplateColumns: {
        xs: '1fr',
        sm: 'repeat(2, minmax(0, 1fr))',
        md: `repeat(${isSidebarCollapsed ? COLLAPSED_SIDEBAR_COLUMNS : EXPANDED_SIDEBAR_COLUMNS}, minmax(0, 1fr))`
    },
    columnGap: 1.5,
    rowGap: 1
});

// Makes a field span the full width of the grid.
export const FULL_ROW_SX = { gridColumn: '1 / -1', minWidth: 0 };
