// Assuming 'supabase' is initialized in your supabase.js file[cite: 1]

async function loadPjLoans() {
    const { data: loans, error } = await supabase
        .from('loans')
        .select('*')
        .eq('location', 'pj'); // Only fetch loans where location is 'pj'

    if (error) {
        console.error("Error fetching loans:", error);
        return;
    }

    const tbody = document.getElementById('linkTableBody');
    tbody.innerHTML = '';

    loans.forEach(loan => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${loan.id}</td>
            <td>${loan.customer_name}</td> <!-- Adjust column name as needed -->
            <td>${loan.location}</td>
            <td>
                <input type="text" id="pj_input_${loan.id}" value="${loan.pj_no || ''}" placeholder="Enter PJ No">
            </td>
            <td>
                <button onclick="updateLink(${loan.id})">Save Link</button>
                <button onclick="unlink(${loan.id})">Unlink</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateLink(loanId) {
    const pjNo = document.getElementById(`pj_input_${loanId}`).value;
    
    const { error } = await supabase
        .from('loans')
        .update({ pj_no: pjNo })
        .eq('id', loanId);

    if (error) alert("Error saving link!");
    else alert("Linked successfully!");
}

async function unlink(loanId) {
    const { error } = await supabase
        .from('loans')
        .update({ pj_no: null })
        .eq('id', loanId);

    if (error) alert("Error unlinking!");
    else {
        alert("Unlinked successfully!");
        loadPjLoans(); // Refresh the table
    }
}

// Load data on page load
document.addEventListener('DOMContentLoaded', loadPjLoans);
