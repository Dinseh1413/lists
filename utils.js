// utils.js

// 1. Formatters
const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 });
const dateFormatter = (dateStr) => {
    if(!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// 2. Toast Notification
function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3000);
}

// 3. THE CORE LOAN CALCULATOR
// Calculates outstanding balance dynamically based on transactions
function calculateLoanOutstanding(loan, transactions) {
    // Filter transactions for this specific loan
    const loanTxns = transactions
        .filter(t => t.loan_id === loan.id)
        .sort((a, b) => new Date(a.txn_date) - new Date(b.txn_date));

    const monthlyRate = (loan.interest_rate / 100) / 12;
    const startDate = new Date(loan.start_date);
    // Use actual today, or loan closed date if closed
    const endDate = loan.status === 'Closed' && loan.closed_date ? new Date(loan.closed_date) : new Date();
    
    let currentPrincipal = loan.principal_amount;
    let totalInterestAccrued = 0;
    let totalInterestPaid = 0;
    let totalPrincipalPaid = 0;
    
    let txnIndex = 0;
    let calcDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (calcDate <= endDate) {
        // Accrue interest on current balance
        totalInterestAccrued += (currentPrincipal * monthlyRate);
        
        // Move to next month
        const nextMonth = new Date(calcDate.getFullYear(), calcDate.getMonth() + 1, 1);
        
        // Process payments made in this month
        while (txnIndex < loanTxns.length && new Date(loanTxns[txnIndex].txn_date) < nextMonth) {
            const t = loanTxns[txnIndex];
            if (t.txn_type === 'Interest Payment') totalInterestPaid += t.amount;
            else if (t.txn_type === 'Principal Repayment') {
                currentPrincipal -= t.amount;
                totalPrincipalPaid += t.amount;
            }
            txnIndex++;
        }
        calcDate = nextMonth;
    }

    return {
        principal: loan.principal_amount - totalPrincipalPaid,
        interest: totalInterestAccrued - totalInterestPaid,
        total: (loan.principal_amount - totalPrincipalPaid) + (totalInterestAccrued - totalInterestPaid)
    };
}
