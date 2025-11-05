"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  Settings,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { WithdrawModal } from "@/components/modals/WithdrawModal";
import {
  formatUSD,
  formatPercent,
  formatNumber,
  getRiskLevel,
  getRiskColor,
  getRiskBgColor,
} from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

// Mock position data
const mockPosition = {
  id: "1",
  pool: "ETH/USDC",
  deposited: 50000,
  currentValue: 51200,
  feesEarned: 1800,
  ilRisk: 2.4,
  status: "active" as const,
  createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
  currentPrice: 2450,
  lowerBound: 2000,
  upperBound: 3000,
  token0Amount: 10.2,
  token1Amount: 25500,
};

const historicalData = [
  { date: "2 weeks ago", value: 50000, il: 0, fees: 0 },
  { date: "12 days ago", value: 50200, il: 0.4, fees: 300 },
  { date: "10 days ago", value: 50500, il: 1.0, fees: 600 },
  { date: "8 days ago", value: 50800, il: 1.6, fees: 900 },
  { date: "6 days ago", value: 51000, il: 2.0, fees: 1200 },
  { date: "4 days ago", value: 51100, il: 2.2, fees: 1500 },
  { date: "2 days ago", value: 51150, il: 2.3, fees: 1650 },
  { date: "Today", value: 51200, il: 2.4, fees: 1800 },
];

const rebalanceHistory = [
  {
    id: "1",
    timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
    reason: "High IL risk detected",
    oldRange: [1800, 2800],
    newRange: [2000, 3000],
    impact: 1.5,
  },
];

export default function PositionDetailPage() {
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  const pnl =
    mockPosition.currentValue -
    mockPosition.deposited +
    mockPosition.feesEarned;
  const pnlPercent = (pnl / mockPosition.deposited) * 100;
  const riskLevel = getRiskLevel(mockPosition.ilRisk);
  const riskColor = getRiskColor(riskLevel);
  const riskBg = getRiskBgColor(riskLevel);
  const daysActive = Math.round(
    (Date.now() - mockPosition.createdAt) / (24 * 60 * 60 * 1000)
  );

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex flex-1">
        <DashboardSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <a
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </a>

              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    {mockPosition.pool} Position
                  </h1>
                  <p className="text-muted-foreground">
                    Active for {daysActive} days
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `https://sepolia.etherscan.io/address/${mockPosition.id}`,
                        "_blank"
                      )
                    }
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    Deposited
                  </p>
                  <p className="text-2xl font-bold">
                    {formatUSD(mockPosition.deposited, 0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    Current Value
                  </p>
                  <p className="text-2xl font-bold">
                    {formatUSD(mockPosition.currentValue, 0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    Fees Earned
                  </p>
                  <p className="text-2xl font-bold text-green-500">
                    +{formatUSD(mockPosition.feesEarned, 0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    Total P&L
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      pnl >= 0 ? "text-green-500" : "text-destructive"
                    }`}
                  >
                    {pnl >= 0 ? "+" : ""}
                    {formatUSD(pnl, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pnlPercent >= 0 ? "+" : ""}
                    {pnlPercent.toFixed(2)}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left Column - Charts */}
              <div className="lg:col-span-2 space-y-6">
                {/* Value Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Position Value Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={historicalData}>
                        <defs>
                          <linearGradient
                            id="valueGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="rgb(34, 197, 94)"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="rgb(34, 197, 94)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          stroke="currentColor"
                          className="text-muted-foreground"
                          style={{ fontSize: "10px" }}
                        />
                        <YAxis
                          stroke="currentColor"
                          className="text-muted-foreground"
                          style={{ fontSize: "10px" }}
                          tickFormatter={(value) =>
                            `$${(value / 1000).toFixed(0)}k`
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--background)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [
                            `$${value.toLocaleString()}`,
                            "Value",
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="rgb(34, 197, 94)"
                          strokeWidth={2}
                          fill="url(#valueGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* IL & Fees Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>IL vs Fees Earned</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={historicalData}>
                        <XAxis
                          dataKey="date"
                          stroke="currentColor"
                          className="text-muted-foreground"
                          style={{ fontSize: "10px" }}
                        />
                        <YAxis
                          stroke="currentColor"
                          className="text-muted-foreground"
                          style={{ fontSize: "10px" }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--background)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="il"
                          stroke="rgb(239, 68, 68)"
                          strokeWidth={2}
                          name="IL %"
                        />
                        <Line
                          type="monotone"
                          dataKey="fees"
                          stroke="rgb(34, 197, 94)"
                          strokeWidth={2}
                          name="Fees $"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Rebalance History */}
                <Card>
                  <CardHeader>
                    <CardTitle>Rebalancing History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {rebalanceHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No rebalancing events yet
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {rebalanceHistory.map((event) => (
                          <div
                            key={event.id}
                            className="p-4 rounded-lg bg-muted/50 border border-border"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-sm font-medium">
                                {event.reason}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(event.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">
                                  Old Range
                                </p>
                                <p className="font-medium">
                                  ${event.oldRange[0]} - ${event.oldRange[1]}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">
                                  New Range
                                </p>
                                <p className="font-medium text-primary">
                                  ${event.newRange[0]} - ${event.newRange[1]}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs text-green-500 mt-2">
                              IL prevented: ~{event.impact.toFixed(2)}%
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Info & Actions */}
              <div className="space-y-6">
                {/* Position Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Position Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Composition
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">ETH</span>
                          <span className="font-medium">
                            {mockPosition.token0Amount} ETH
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">USDC</span>
                          <span className="font-medium">
                            {formatNumber(mockPosition.token1Amount, 0)} USDC
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Price Range
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Lower:</span>
                          <span className="font-medium">
                            ${mockPosition.lowerBound}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Current:</span>
                          <span className="font-medium text-primary">
                            ${mockPosition.currentPrice}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Upper:</span>
                          <span className="font-medium">
                            ${mockPosition.upperBound}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Status
                      </p>
                      <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
                        <span className="text-green-500">✓ In Range</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* IL Risk Card */}
                <Card className={`border ${riskBg.replace("bg-", "border-")}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className={`w-5 h-5 ${riskColor}`} />
                      Current IL Risk
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-4">
                      <p className={`text-4xl font-bold ${riskColor}`}>
                        {formatPercent(mockPosition.ilRisk, 2)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 capitalize">
                        {riskLevel} Risk Level
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Based on current market conditions and position parameters
                    </p>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      className="w-full"
                      onClick={() => setWithdrawModalOpen(true)}
                    >
                      Withdraw
                    </Button>
                    <Button className="w-full" variant="outline">
                      Adjust Range
                    </Button>
                    <Button className="w-full" variant="outline">
                      Harvest Fees
                    </Button>
                  </CardContent>
                </Card>

                {/* Performance Summary */}
                <Card className="bg-linear-to-br from-primary/10 to-secondary/10">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Performance
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">APY:</span>
                        <span className="font-semibold text-green-500">
                          +14.2%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ROI:</span>
                        <span className="font-semibold text-green-500">
                          +{pnlPercent.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          IL Prevented:
                        </span>
                        <span className="font-semibold">$1,250</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      <WithdrawModal
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        position={mockPosition}
      />
    </div>
  );
}
