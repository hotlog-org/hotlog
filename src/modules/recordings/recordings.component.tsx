"use client";

import {
  type BaseChartData,
  DonutChart,
  LineChart,
  type TimeSeriesData,
} from "@/shared/charts";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/ui/drawer";
import { Input } from "@/shared/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { cn } from "@/shared/utils/shadcn.utils";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

interface ApiLog {
  id: string;
  timestamp: Date;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number;
  error?: string;
  traceId: string;
  clientId?: string;
  userAgent?: string;
  ipAddress?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  stackTrace?: string;
}

// Generate sample logs with some errors
const generateSampleLogs = (): ApiLog[] => {
  const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
  const endpoints = [
    "/api/v1/users",
    "/api/v1/payments",
    "/api/v1/orders",
    "/api/v1/products",
    "/api/v1/auth/login",
    "/api/v1/documents",
    "/api/v1/analytics",
    "/api/v1/notifications",
  ];
  const errors = [
    "Timeout after 30s",
    "Connection refused",
    "Invalid request payload",
    "Rate limit exceeded",
    "Database connection error",
    "Authentication failed",
  ];

  const logs: ApiLog[] = [];
  const now = Date.now();

  for (let i = 0; i < 50; i++) {
    const method = methods[Math.floor(Math.random() * methods.length)];
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const statusCode = Math.random() < 0.7
      ? 200 + Math.floor(Math.random() * 3) * 100 // Mostly 2xx
      : Math.random() < 0.5
      ? 400 + Math.floor(Math.random() * 26) // 4xx
      : 500 + Math.floor(Math.random() * 16); // 5xx

    const isError = statusCode >= 400;
    const responseTime = Math.floor(Math.random() * 2000) + 50;

    const errorMessage = isError
      ? errors[Math.floor(Math.random() * errors.length)]
      : undefined;
    logs.push({
      id: `log-${i}`,
      timestamp: new Date(now - i * 60000 - Math.random() * 300000),
      method,
      endpoint,
      statusCode,
      responseTime,
      error: errorMessage,
      traceId: `trace-${Math.random().toString(36).substr(2, 9)}`,
      clientId: `client-${Math.floor(Math.random() * 10)}`,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      requestHeaders: {
        "Content-Type": "application/json",
        "Authorization": "Bearer ***",
        "X-Request-ID": `req-${Math.random().toString(36).substr(2, 9)}`,
      },
      requestBody: method !== "GET"
        ? JSON.stringify(
          { userId: Math.floor(Math.random() * 1000), action: "process" },
          null,
          2,
        )
        : undefined,
      responseBody: isError
        ? JSON.stringify({ error: errorMessage, code: statusCode }, null, 2)
        : JSON.stringify(
          { success: true, data: { id: Math.floor(Math.random() * 1000) } },
          null,
          2,
        ),
      stackTrace: isError
        ? `Error: ${errorMessage}\n    at processRequest (handler.js:45)\n    at handleAPI (router.js:123)\n    at middleware (app.js:67)`
        : undefined,
    });
  }

  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

function getStatusBadge(statusCode: number) {
  if (statusCode >= 200 && statusCode < 300) {
    return (
      <Badge
        variant="default"
        className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
      >
        <CheckCircle2 className="w-3 h-3 mr-1" />
        {statusCode}
      </Badge>
    );
  }
  if (statusCode >= 400 && statusCode < 500) {
    return (
      <Badge
        variant="default"
        className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
      >
        <AlertCircle className="w-3 h-3 mr-1" />
        {statusCode}
      </Badge>
    );
  }
  if (statusCode >= 500) {
    return (
      <Badge
        variant="default"
        className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
      >
        <XCircle className="w-3 h-3 mr-1" />
        {statusCode}
      </Badge>
    );
  }
  return <Badge variant="secondary">{statusCode}</Badge>;
}

function getMethodBadge(method: string) {
  const colors: Record<string, string> = {
    GET: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    POST:
      "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    PUT:
      "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    PATCH:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    DELETE: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  };

  return (
    <Badge variant="outline" className={colors[method] || ""}>
      {method}
    </Badge>
  );
}

export function RecordingsComponent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">(
    "all",
  );
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);
  const logs = useMemo(() => generateSampleLogs(), []);

  const stats = useMemo(() => {
    const total = logs.length;
    const success = logs.filter((l) =>
      l.statusCode >= 200 && l.statusCode < 400
    ).length;
    const clientErrors =
      logs.filter((l) => l.statusCode >= 400 && l.statusCode < 500).length;
    const serverErrors = logs.filter((l) => l.statusCode >= 500).length;
    const avgResponseTime = Math.round(
      logs.reduce((sum, l) => sum + l.responseTime, 0) / total,
    );
    const successRate = ((success / total) * 100).toFixed(1);
    const errorRate = (((clientErrors + serverErrors) / total) * 100).toFixed(
      1,
    );

    return {
      total,
      success,
      clientErrors,
      serverErrors,
      avgResponseTime,
      successRate: parseFloat(successRate),
      errorRate: parseFloat(errorRate),
    };
  }, [logs]);

  const chartData = useMemo(() => {
    const statusData: BaseChartData[] = [
      { name: "Success (2xx-3xx)", value: stats.success },
      { name: "Client Error (4xx)", value: stats.clientErrors },
      { name: "Server Error (5xx)", value: stats.serverErrors },
    ];

    const timeSeriesData: TimeSeriesData[] = [];
    const now = Date.now();
    const timeBuckets: Record<string, { success: number; error: number }> = {};

    logs.forEach((log) => {
      const bucketTime = new Date(log.timestamp);
      bucketTime.setMinutes(0, 0, 0);
      const key = bucketTime.getTime().toString();

      if (!timeBuckets[key]) {
        timeBuckets[key] = { success: 0, error: 0 };
      }

      if (log.statusCode >= 200 && log.statusCode < 400) {
        timeBuckets[key].success++;
      } else {
        timeBuckets[key].error++;
      }
    });

    Object.entries(timeBuckets)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([timeKey, counts]) => {
        timeSeriesData.push({
          date: new Date(Number(timeKey)),
          value: counts.success,
          category: "Success",
        });
        timeSeriesData.push({
          date: new Date(Number(timeKey)),
          value: counts.error,
          category: "Errors",
        });
      });

    return { statusData, timeSeriesData };
  }, [logs, stats]);

  const errorSummary = useMemo(() => {
    const byEndpoint: Record<string, number> = {};
    const byError: Record<string, number> = {};

    logs
      .filter((l) => l.statusCode >= 400)
      .forEach((log) => {
        byEndpoint[log.endpoint] = (byEndpoint[log.endpoint] || 0) + 1;
        if (log.error) {
          byError[log.error] = (byError[log.error] || 0) + 1;
        }
      });

    return { byEndpoint, byError };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.traceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.error?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.ipAddress?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "success" && log.statusCode < 400) ||
        (statusFilter === "error" && log.statusCode >= 400);

      return matchesSearch && matchesStatus;
    });
  }, [logs, searchQuery, statusFilter]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* <div className="flex items-center justify-between"> */}
      {/*   <div> */}
      {/*     <h1 className="text-3xl font-bold tracking-tight">API Recordings</h1> */}
      {/*     <p className="text-muted-foreground mt-1"> */}
      {/*       Monitor and analyze all API requests in real-time */}
      {/*     </p> */}
      {/*   </div> */}
      {/* </div> */}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All recorded requests
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.successRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.success} successful requests
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.errorRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.clientErrors + stats.serverErrors} failed requests
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average latency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {/* <div className="grid gap-4 md:grid-cols-2"> */}
      {/*   <Card> */}
      {/*     <CardHeader> */}
      {/*       <CardTitle>Success vs Error Rate</CardTitle> */}
      {/*     </CardHeader> */}
      {/*     <CardContent> */}
      {/*       <DonutChart data={chartData.statusData} height={250} /> */}
      {/*     </CardContent> */}
      {/*   </Card> */}
      {/*   <Card> */}
      {/*     <CardHeader> */}
      {/*       <CardTitle>Request Trends Over Time</CardTitle> */}
      {/*     </CardHeader> */}
      {/*     <CardContent> */}
      {/*       <LineChart data={chartData.timeSeriesData} height={250} /> */}
      {/*     </CardContent> */}
      {/*   </Card> */}
      {/* </div> */}

      {/* Error Summary */}
      {/* {Object.keys(errorSummary.byEndpoint).length > 0 && ( */}
      {/*   <Card> */}
      {/*     <CardHeader> */}
      {/*       <CardTitle>Error Summary</CardTitle> */}
      {/*     </CardHeader> */}
      {/*     <CardContent> */}
      {/*       <div className="grid gap-4 md:grid-cols-2"> */}
      {/*         <div> */}
      {/*           <h4 className="text-sm font-medium mb-2">Errors by Endpoint</h4> */}
      {/*           <div className="space-y-2"> */}
      {/*             {Object.entries(errorSummary.byEndpoint) */}
      {/*               .sort(([, a], [, b]) => b - a) */}
      {/*               .slice(0, 5) */}
      {/*               .map(([endpoint, count]) => ( */}
      {/*                 <div */}
      {/*                   key={endpoint} */}
      {/*                   className="flex items-center justify-between text-sm" */}
      {/*                 > */}
      {/*                   <span className="font-mono text-xs">{endpoint}</span> */}
      {/*                   <Badge variant="destructive">{count}</Badge> */}
      {/*                 </div> */}
      {/*               ))} */}
      {/*           </div> */}
      {/*         </div> */}
      {/*         <div> */}
      {/*           <h4 className="text-sm font-medium mb-2">Errors by Type</h4> */}
      {/*           <div className="space-y-2"> */}
      {/*             {Object.entries(errorSummary.byError) */}
      {/*               .sort(([, a], [, b]) => b - a) */}
      {/*               .slice(0, 5) */}
      {/*               .map(([error, count]) => ( */}
      {/*                 <div */}
      {/*                   key={error} */}
      {/*                   className="flex items-center justify-between text-sm" */}
      {/*                 > */}
      {/*                   <span className="text-xs truncate flex-1">{error}</span> */}
      {/*                   <Badge variant="destructive" className="ml-2"> */}
      {/*                     {count} */}
      {/*                   </Badge> */}
      {/*                 </div> */}
      {/*               ))} */}
      {/*           </div> */}
      {/*         </div> */}
      {/*       </div> */}
      {/*     </CardContent> */}
      {/*   </Card> */}
      {/* )} */}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recordings</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by endpoint, method, trace ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <div className="flex gap-1">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "success" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("success")}
                >
                  Success
                </Button>
                <Button
                  variant={statusFilter === "error" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("error")}
                >
                  Errors
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-muted">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Timestamp</TableHead>
                  <TableHead className="w-[100px]">Method</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[120px]">Response Time</TableHead>
                  <TableHead className="w-[150px]">Trace ID</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0
                  ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No logs found matching your filters
                      </TableCell>
                    </TableRow>
                  )
                  : (
                    filteredLogs.map((log) => (
                      <TableRow
                        key={log.id}
                        className={cn(
                          log.statusCode >= 400 &&
                            "bg-destructive/5 hover:bg-destructive/10",
                          "cursor-pointer",
                        )}
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell className="font-mono text-xs">
                          {formatTime(log.timestamp)}
                        </TableCell>
                        <TableCell>{getMethodBadge(log.method)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.endpoint}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(log.statusCode)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span
                              className={cn(
                                log.responseTime > 1000 &&
                                  "text-yellow-600 dark:text-yellow-400",
                                log.responseTime > 2000 &&
                                  "text-red-600 dark:text-red-400",
                              )}
                            >
                              {log.responseTime}ms
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(log.traceId);
                            }}
                            className="hover:underline flex items-center gap-1"
                            title="Copy trace ID"
                          >
                            {log.traceId}
                            <Copy className="w-3 h-3" />
                          </button>
                        </TableCell>
                        <TableCell>
                          {log.error && (
                            <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                              <AlertCircle className="w-3 h-3" />
                              {log.error}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="w-[80px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredLogs.length} of {logs.length} logs
          </div>
        </CardContent>
      </Card>

      {/* Detailed View Drawer */}
      <Drawer
        open={!!selectedLog}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLog(null);
          }
        }}
        direction="right"
      >
        <DrawerContent className="h-full w-full max-w-5xl border-l border-muted bg-background p-0 sm:max-w-4xl lg:max-w-5xl">
          {selectedLog && (
            <div className="flex h-full flex-col">
              <DrawerHeader className="border-b border-muted px-6 pb-4 pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DrawerTitle className="text-lg font-semibold">
                      Request Details
                    </DrawerTitle>
                    <DrawerDescription className="mt-1 text-sm">
                      Full request and response information for debugging
                    </DrawerDescription>
                  </div>
                  <DrawerClose asChild>
                    <Button variant="outline" size="icon">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close drawer</span>
                    </Button>
                  </DrawerClose>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatTime(selectedLog.timestamp)}</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
                  <button
                    className="flex items-center gap-1 font-mono underline-offset-4 hover:underline"
                    onClick={() => copyToClipboard(selectedLog.traceId)}
                  >
                    {selectedLog.traceId}
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </DrawerHeader>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-muted bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Status
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      {getStatusBadge(selectedLog.statusCode)}
                      {selectedLog.error && (
                        <span className="text-xs text-destructive">
                          {selectedLog.error}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-muted bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Response Time
                    </p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-2xl font-semibold">
                        {selectedLog.responseTime}
                      </span>
                      <span className="text-xs text-muted-foreground">ms</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-muted bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Method
                    </p>
                    <div className="mt-3">
                      {getMethodBadge(selectedLog.method)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-muted bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      IP Address
                    </p>
                    <span className="mt-3 block font-mono text-xs">
                      {selectedLog.ipAddress}
                    </span>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-6">
                    <section className="rounded-lg border border-muted p-5">
                      <h3 className="text-sm font-semibold">
                        Request Overview
                      </h3>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Endpoint
                          </p>
                          <p className="mt-1 font-mono text-xs">
                            {selectedLog.endpoint}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Timestamp
                          </p>
                          <p className="mt-1 font-mono text-xs">
                            {formatTime(selectedLog.timestamp)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Client ID
                          </p>
                          <p className="mt-1 font-mono text-xs">
                            {selectedLog.clientId}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            User Agent
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {selectedLog.userAgent}
                          </p>
                        </div>
                      </div>
                    </section>

                    {selectedLog.requestBody && (
                      <section className="rounded-lg border border-muted p-5">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold">
                            Request Body
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              copyToClipboard(selectedLog.requestBody || "")}
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            Copy
                          </Button>
                        </div>
                        <pre className="max-h-64 overflow-x-auto rounded-md border bg-muted/50 p-3 text-xs">
                          {selectedLog.requestBody}
                        </pre>
                      </section>
                    )}

                    {selectedLog.requestHeaders && (
                      <section className="rounded-lg border border-muted p-5">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold">
                            Request Headers
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              copyToClipboard(
                                JSON.stringify(
                                  selectedLog.requestHeaders,
                                  null,
                                  2,
                                ),
                              )}
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            Copy
                          </Button>
                        </div>
                        <pre className="max-h-64 overflow-x-auto rounded-md border bg-muted/50 p-3 text-xs">
                          {JSON.stringify(selectedLog.requestHeaders, null, 2)}
                        </pre>
                      </section>
                    )}
                  </div>

                  <div className="space-y-6">
                    {selectedLog.responseBody && (
                      <section className="rounded-lg border border-muted p-5">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold">
                            Response Body
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              copyToClipboard(selectedLog.responseBody || "")}
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            Copy
                          </Button>
                        </div>
                        <pre
                          className={cn(
                            "max-h-64 overflow-x-auto rounded-md border p-3 text-xs",
                            selectedLog.statusCode >= 400
                              ? "border-destructive/20 bg-destructive/10 text-destructive dark:text-red-400"
                              : "bg-muted/50",
                          )}
                        >
                          {selectedLog.responseBody}
                        </pre>
                      </section>
                    )}

                    {selectedLog.stackTrace && (
                      <section className="rounded-lg border border-destructive/30 bg-destructive/10 p-5">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-destructive dark:text-red-400">
                            Stack Trace
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              copyToClipboard(selectedLog.stackTrace || "")}
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            Copy
                          </Button>
                        </div>
                        <pre className="max-h-64 overflow-x-auto text-xs text-destructive dark:text-red-400">
                          {selectedLog.stackTrace}
                        </pre>
                      </section>
                    )}

                    {selectedLog.error && (
                      <section className="rounded-lg border border-destructive/30 bg-destructive/10 p-5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-destructive dark:text-red-400">
                          <AlertCircle className="h-4 w-4" />
                          {selectedLog.error}
                        </div>
                        <p className="mt-2 text-xs text-destructive/80">
                          Investigate the response payload and stack trace for
                          additional context.
                        </p>
                      </section>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
