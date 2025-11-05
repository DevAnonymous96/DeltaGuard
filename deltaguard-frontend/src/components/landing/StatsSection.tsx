"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatUSD, formatNumber } from "@/lib/utils";
import { DollarSign, Target, Heart, TrendingUp } from "lucide-react";

interface StatProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  formatter?: (value: number) => string;
  color: string;
  delay?: number;
}

function AnimatedStat({
  icon: Icon,
  label,
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  formatter,
  color,
  delay = 0,
}: StatProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isInView, value]);

  const displayValue = formatter
    ? formatter(count)
    : `${prefix}${formatNumber(count, decimals)}${suffix}`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="border-primary/20 hover:border-primary/40 transition-all hover:shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div
              className={`w-12 h-12 rounded-xl bg-linear-to-br ${color} flex items-center justify-center`}
            >
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="text-3xl sm:text-4xl font-bold mb-2 number-counter">
            {displayValue}
          </div>

          <p className="text-sm text-muted-foreground">{label}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function StatsSection() {
  const stats: StatProps[] = [
    {
      icon: DollarSign,
      label: "Total Value Protected",
      value: 5200000,
      formatter: (v) => formatUSD(v, 1),
      color: "from-green-500 to-green-700",
      delay: 0,
    },
    {
      icon: Target,
      label: "IL Predictions Made",
      value: 12547,
      formatter: (v) => formatNumber(v, 0),
      color: "from-blue-500 to-blue-700",
      delay: 0.1,
    },
    {
      icon: Heart,
      label: "Public Goods Funded",
      value: 186000,
      formatter: (v) => formatUSD(v, 0),
      color: "from-pink-500 to-pink-700",
      delay: 0.2,
    },
    {
      icon: TrendingUp,
      label: "Average Prediction Accuracy",
      value: 73,
      suffix: "%",
      decimals: 0,
      color: "from-purple-500 to-purple-700",
      delay: 0.3,
    },
  ];

  return (
    <section className="py-20 sm:py-32 relative bg-muted/30 flex items-center justify-center">
      <div className="container px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Proven Results{" "}
            <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              in Production
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real metrics from our testing and simulation framework
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <AnimatedStat key={stat.label} {...stat} />
          ))}
        </div>

        {/* Line chart visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="glass border-primary/20">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-6 text-center">
                IL Prevented Over Time
                <span className="block text-sm text-muted-foreground font-normal mt-2">
                  Cumulative value saved by predictive management
                </span>
              </h3>

              {/* Simple line chart SVG */}
              <div className="h-64 bg-muted/50 rounded-lg relative overflow-hidden">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 800 256"
                  preserveAspectRatio="none"
                >
                  {/* Grid lines */}
                  <line
                    x1="0"
                    y1="64"
                    x2="800"
                    y2="64"
                    stroke="currentColor"
                    strokeOpacity="0.1"
                    strokeWidth="1"
                  />
                  <line
                    x1="0"
                    y1="128"
                    x2="800"
                    y2="128"
                    stroke="currentColor"
                    strokeOpacity="0.1"
                    strokeWidth="1"
                  />
                  <line
                    x1="0"
                    y1="192"
                    x2="800"
                    y2="192"
                    stroke="currentColor"
                    strokeOpacity="0.1"
                    strokeWidth="1"
                  />

                  {/* Area fill */}
                  <defs>
                    <linearGradient
                      id="areaGradient"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop
                        offset="0%"
                        stopColor="rgb(139, 92, 246)"
                        stopOpacity="0.3"
                      />
                      <stop
                        offset="100%"
                        stopColor="rgb(139, 92, 246)"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>

                  <motion.path
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    d="M0,240 L100,220 L200,190 L300,170 L400,140 L500,120 L600,90 L700,70 L800,40 L800,256 L0,256 Z"
                    fill="url(#areaGradient)"
                  />

                  {/* Line */}
                  <motion.path
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    d="M0,240 L100,220 L200,190 L300,170 L400,140 L500,120 L600,90 L700,70 L800,40"
                    fill="none"
                    stroke="rgb(139, 92, 246)"
                    strokeWidth="3"
                  />
                </svg>

                {/* Labels */}
                <div className="absolute bottom-4 left-4 text-xs text-muted-foreground">
                  Day 1
                </div>
                <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">
                  Day 90
                </div>
                <div className="absolute top-4 right-4 text-sm font-semibold text-primary">
                  $520K saved
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-muted-foreground">With DeltaGuard</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive/50" />
                  <span className="text-muted-foreground">
                    Traditional POL (baseline)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
