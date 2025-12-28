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
    let container = document.getElementById('toast-container');
    if(!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3000);
}

// 3. THEME MANAGER
function initTheme() {
    const savedTheme = localStorage.getItem('app-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
        document.body.setAttribute('data-theme', 'dark');
    }
    const btn = document.createElement('button');
    btn.id = 'theme-toggle-btn';
    btn.innerHTML = getThemeIcon(document.body.getAttribute('data-theme') === 'dark');
    btn.onclick = toggleTheme;
    document.body.appendChild(btn);
}

function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('app-theme', 'light');
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('app-theme', 'dark');
    }
    const btn = document.getElementById('theme-toggle-btn');
    if(btn) btn.innerHTML = getThemeIcon(!isDark);
}

function getThemeIcon(isDark) {
    return isDark 
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
}

// 4. CORE LOAN CALCULATOR (FIXED: Handles payment on due date)
function calculateLoanOutstanding(loan, transactions) {
    const loanTxns = transactions
        .filter(t => t.loan_id === loan.id)
        .sort((a, b) => new Date(a.txn_date) - new Date(b.txn_date));

    const monthlyRate = (loan.interest_rate / 100) / 12;
    const startDate = new Date(loan.start_date);
    startDate.setHours(0,0,0,0); // Normalize time
    
    // Determine cutoff
    const endDate = loan.status === 'Closed' && loan.closed_date ? new Date(loan.closed_date) : new Date();
    endDate.setHours(23, 59, 59, 999); 
    
    let currentPrincipal = loan.principal_amount;
    let totalInterestAccrued = 0;
    let totalInterestPaid = 0;
    let totalPrincipalPaid = 0;
    let breakdown = [];
    
    let txnIndex = 0;
    let monthCount = 1;
    let lastDueDate = new Date(startDate);

    // 1. COMPLETED MONTHS LOOP
    while (true) {
        // Calculate the next Anniversary Date
        let dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + monthCount);
        dueDate.setHours(0,0,0,0); // Normalize time
        
        // Handle Month End Snap (e.g. Jan 31 -> Feb 28)
        if (dueDate.getDate() !== startDate.getDate()) {
            dueDate.setDate(0); 
        }

        // STOP if the due date is in the future
        if (dueDate > endDate) {
            break;
        }

        lastDueDate = dueDate;

        // Accrue Interest for this period
        const interestForThisMonth = currentPrincipal * monthlyRate;
        totalInterestAccrued += interestForThisMonth;
        
        breakdown.push({
            date: dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            principal: currentPrincipal,
            interest: interestForThisMonth
        });

        // --- THE FIX IS HERE ---
        // Process payments made ON or BEFORE this due date
        // (Using <= ensures payment on 20 Dec reduces principal for the NEXT cycle)
        while (txnIndex < loanTxns.length) {
            const tDate = new Date(loanTxns[txnIndex].txn_date);
            tDate.setHours(0,0,0,0);

            if (tDate <= dueDate) {
                const t = loanTxns[txnIndex];
                if (t.txn_type === 'Interest Payment') totalInterestPaid += t.amount;
                else if (t.txn_type === 'Principal Repayment') {
                    currentPrincipal -= t.amount;
                    totalPrincipalPaid += t.amount;
                }
                txnIndex++;
            } else {
                break; // Transaction is in the future relative to this due date
            }
        }
        
        monthCount++;
    }

    // 2. RUNNING MONTH LOGIC
    // If we passed the last due date, charge for the running month using the NEW principal
    if (loan.status !== 'Closed' && endDate > lastDueDate) {
        let runningDueDate = new Date(startDate);
        runningDueDate.setMonth(startDate.getMonth() + monthCount);
        if (runningDueDate.getDate() !== startDate.getDate()) runningDueDate.setDate(0);

        // This uses 'currentPrincipal' which has been correctly reduced by the loop above
        const interestForRunningMonth = currentPrincipal * monthlyRate;
        totalInterestAccrued += interestForRunningMonth;

        breakdown.push({
            date: runningDueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + " (Running)",
            principal: currentPrincipal,
            interest: interestForRunningMonth
        });
    }

    // 3. Process any remaining transactions (that happened recently after calculation)
    while (txnIndex < loanTxns.length) {
         const t = loanTxns[txnIndex];
         if (t.txn_type === 'Interest Payment') totalInterestPaid += t.amount;
         else if (t.txn_type === 'Principal Repayment') {
             currentPrincipal -= t.amount;
             totalPrincipalPaid += t.amount;
         }
         txnIndex++;
    }

    return {
        principal: loan.principal_amount - totalPrincipalPaid,
        interest: totalInterestAccrued - totalInterestPaid,
        total: (loan.principal_amount - totalPrincipalPaid) + (totalInterestAccrued - totalInterestPaid),
        breakdown: breakdown
    };
}

document.addEventListener('DOMContentLoaded', initTheme);
