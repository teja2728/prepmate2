import axios from "axios";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PerformanceGraph = ({
  title = "Performance Over Time",
  subtitle = "Track your weekly improvement in Resume and Job Fit scores.",
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch live performance data from backend
  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/user/progress/performance", {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Ensure backend sends: [{ week: "Week 1", resume: 75, jobFit: 80 }, ...]
        setData(response.data || []);
      } catch (error) {
        console.error("Error fetching performance data:", error);
        // fallback data (optional)
        setData([
          { week: "Week 1", resume: 60, jobFit: 55 },
          { week: "Week 2", resume: 65, jobFit: 62 },
          { week: "Week 3", resume: 70, jobFit: 68 },
          { week: "Week 4", resume: 78, jobFit: 73 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center text-gray-500">
        Loading performance data...
      </div>
    );
  }

  return (
    <motion.div
      id="performance-graph"
      className="card mt-4 bg-white shadow-lg rounded-2xl p-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="mb-4">
        <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis domain={[0, 100]} />
            <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
            <Legend />
            <Line
              type="monotone"
              dataKey="resume"
              name="Resume Score"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="jobFit"
              name="Job Fit Score"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default PerformanceGraph;
