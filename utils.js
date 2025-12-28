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
    // Auto-create container if missing
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

// 3. THEME MANAGER (New Feature)
function initTheme() {
    // Check localStorage or System Preference
    const savedTheme = localStorage.getItem('app-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Apply initial theme
    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
        document.body.setAttribute('data-theme', 'dark');
    }

    // Inject Toggle Button
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
    // Update Icon
    const btn = document.getElementById('theme-toggle-btn');
    if(btn) btn.innerHTML = getThemeIcon(!isDark);
}

function getThemeIcon(isDark) {
    if (isDark) {
        // Sun Icon
        return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    } else {
        // Moon Icon
        return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    }
}

// 4. CORE LOAN CALCULATOR
function calculateLoanOutstanding(loan, transactions) {
    const loanTxns = transactions
        .filter(t => t.loan_id === loan.id)
        .sort((a, b) => new Date(a.txn_date) - new Date(b.txn_date));

    const monthlyRate = (loan.interest_rate / 100) / 12;
    const startDate = new Date(loan.start_date);
    const endDate = loan.status === 'Closed' && loan.closed_date ? new Date(loan.closed_date) : new Date();
    
    let currentPrincipal = loan.principal_amount;
    let totalInterestAccrued = 0;
    let totalInterestPaid = 0;
    let totalPrincipalPaid = 0;
    
    let txnIndex = 0;
    let calcDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (calcDate <= endDate) {
        totalInterestAccrued += (currentPrincipal * monthlyRate);
        const nextMonth = new Date(calcDate.getFullYear(), calcDate.getMonth() + 1, 1);
        
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

// 5. AUTO-INIT THEME ON LOAD
document.addEventListener('DOMContentLoaded', initTheme);
