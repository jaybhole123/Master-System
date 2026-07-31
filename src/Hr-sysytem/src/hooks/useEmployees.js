import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, employee_id, user_name, department, designation, Designation, status, created_at, base_salary, account_no')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        if (data) {
          const formattedEmployees = data.map(u => ({
            id: u.employee_id || `EMP-${u.id}`,
            name: u.user_name || 'Unknown',
            department: u.department,
            designation: u.Designation || u.designation,
            status: u.status || 'Active',
            baseSalary: u.base_salary || 0,
            accountNo: u.account_no || '',
            dbId: u.id
          }));
          setEmployees(formattedEmployees);
        }
      } catch (err) {
        console.error('Error fetching employees:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchEmployees();
  }, []);

  return [employees, setEmployees, loading, error];
}
