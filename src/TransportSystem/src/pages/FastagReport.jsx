import React, { useState, useEffect } from 'react';
import supabase from '../../../SupabaseClient';

export default function FastagReport() {
  const [loading, setLoading] = useState(true);
  const [uniqueTrucks, setUniqueTrucks] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('truck_reports')
        .select('vehicle_no, do_no')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching data:", error);
      } else if (data) {
        const unique = [];
        const seen = new Set();
        data.forEach(item => {
          if (item.vehicle_no && !seen.has(item.vehicle_no.trim().toLowerCase())) {
            seen.add(item.vehicle_no.trim().toLowerCase());
            unique.push({
              vehicleNo: item.vehicle_no,
              doNo: item.do_no || '-'
            });
          }
        });
        setUniqueTrucks(unique);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Fastag Reports Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your Fastag operations</p>
      </div>
      
      {loading ? (
        <div className="animate-pulse">
           <div className="h-64 bg-gray-200 rounded-xl w-full"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-y-auto max-h-[600px]">
            <table className="w-full text-left border-collapse relative">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-4 font-medium text-gray-600 w-24 bg-gray-50">S.No.</th>
                  <th className="py-3 px-4 font-medium text-gray-600 bg-gray-50">Vehicle No.</th>
                  <th className="py-3 px-4 font-medium text-gray-600 bg-gray-50">DO No.</th>
                </tr>
              </thead>
              <tbody>
                {uniqueTrucks.length > 0 ? (
                  uniqueTrucks.map((truck, index) => (
                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 px-4 text-gray-600">{index + 1}</td>
                      <td className="py-3 px-4 font-medium text-gray-800">
                        {truck.vehicleNo?.toUpperCase().includes('CG') ? truck.vehicleNo : `CG-10-CG ${truck.vehicleNo}`}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{truck.doNo}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="py-8 text-center text-gray-500">No trucks found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
