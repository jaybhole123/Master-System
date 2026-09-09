import re

with open('src/Hr-sysytem/src/pages/Payslip.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace states
content = content.replace(
    \"const [payslipMonth, setPayslipMonth] = useState('');\",
    \"\"\"const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [displayMode, setDisplayMode] = useState('Month-wise Breakdown');
  const [multiMonthData, setMultiMonthData] = useState([]);\"\"\"
)

# 2. Update the inputs in the UI
inputs_target = \"\"\"<div className=\"form-group\">
            <label style={{ fontWeight: 600, marginBottom: '6px', display: 'block' }}>Payslip Month & Year</label>
            <input 
              type=\"text\" 
              value={payslipMonth} 
              onChange={(e) => setPayslipMonth(e.target.value)} 
              placeholder=\"e.g. July 2026\"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>\"\"\"

inputs_replacement = \"\"\"<div className=\"form-group\">
            <label style={{ fontWeight: 600, marginBottom: '6px', display: 'block' }}>From Month</label>
            <input 
              type=\"month\" 
              value={fromMonth} 
              onChange={(e) => setFromMonth(e.target.value)} 
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div className=\"form-group\">
            <label style={{ fontWeight: 600, marginBottom: '6px', display: 'block' }}>To Month</label>
            <input 
              type=\"month\" 
              value={toMonth} 
              onChange={(e) => setToMonth(e.target.value)} 
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>
          {fromMonth && toMonth && fromMonth !== toMonth && (
            <div className=\"form-group\" style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontWeight: 600, marginBottom: '6px', display: 'block' }}>Display Mode</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type=\"radio\" name=\"displayMode\" value=\"Month-wise Breakdown\" checked={displayMode === 'Month-wise Breakdown'} onChange={(e) => setDisplayMode(e.target.value)} />
                  Month-wise Breakdown
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type=\"radio\" name=\"displayMode\" value=\"Consolidated Summary\" checked={displayMode === 'Consolidated Summary'} onChange={(e) => setDisplayMode(e.target.value)} />
                  Consolidated Summary
                </label>
              </div>
            </div>
          )}\"\"\"

content = content.replace(inputs_target, inputs_replacement)

# Save back
with open('src/Hr-sysytem/src/pages/Payslip.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
