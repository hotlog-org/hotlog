"use client";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
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
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  Link as LinkIcon,
  Search,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  environment: "production" | "staging" | "development";
  createdAt: Date;
  updatedAt: Date;
  enabledPercentage?: number; // For gradual rollouts
  targetUsers?: string[];
}

// Generate sample feature flags
const generateSampleFlags = (): FeatureFlag[] => {
  const flags: FeatureFlag[] = [
    {
      id: "flag-1",
      key: "new-payment-api",
      name: "New Payment API",
      description: "Enable the new payment processing API endpoint",
      enabled: true,
      environment: "production",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      enabledPercentage: 100,
    },
    {
      id: "flag-2",
      key: "rate-limiting-v2",
      name: "Rate Limiting V2",
      description: "New rate limiting algorithm with improved accuracy",
      enabled: false,
      environment: "production",
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      enabledPercentage: 0,
    },
    {
      id: "flag-3",
      key: "experimental-auth",
      name: "Experimental Authentication",
      description: "Test new OAuth2 flow with enhanced security",
      enabled: true,
      environment: "staging",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      enabledPercentage: 25,
      targetUsers: ["beta-users", "internal-team"],
    },
    {
      id: "flag-4",
      key: "graphql-api",
      name: "GraphQL API",
      description: "Enable GraphQL endpoint alongside REST API",
      enabled: true,
      environment: "production",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      enabledPercentage: 75,
    },
    {
      id: "flag-5",
      key: "analytics-tracking",
      name: "Enhanced Analytics",
      description: "Improved request tracking and analytics collection",
      enabled: false,
      environment: "development",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      enabledPercentage: 0,
    },
    {
      id: "flag-6",
      key: "caching-layer",
      name: "Response Caching",
      description: "Enable caching layer for frequently accessed endpoints",
      enabled: true,
      environment: "production",
      createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      enabledPercentage: 50,
    },
    {
      id: "flag-7",
      key: "webhook-retries",
      name: "Webhook Retry Logic",
      description: "Improved webhook delivery with exponential backoff",
      enabled: false,
      environment: "staging",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      enabledPercentage: 0,
    },
    {
      id: "flag-8",
      key: "api-version-v3",
      name: "API Version 3",
      description: "Enable API v3 endpoints with breaking changes",
      enabled: true,
      environment: "production",
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      enabledPercentage: 100,
    },
  ];

  return flags.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

function getEnvironmentBadge(environment: string) {
  const colors: Record<string, string> = {
    production:
      "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    staging:
      "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    development:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  };

  return (
    <Badge variant="outline" className={colors[environment] || ""}>
      {environment}
    </Badge>
  );
}

const flagFormSchema = z.object({
  key: z.string().min(2, "Key must be at least 2 characters").regex(
    /^[a-z0-9-]+$/,
    "Key must contain only lowercase letters, numbers, and hyphens",
  ),
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  environment: z.enum(["production", "staging", "development"]),
  enabled: z.boolean().default(false),
  enabledPercentage: z.number().min(0).max(100).optional(),
  resources: z.array(z.string()).optional(),
});

type FlagFormValues = z.infer<typeof flagFormSchema>;

export function FlagsComponent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [environmentFilter, setEnvironmentFilter] = useState<
    "all" | "production" | "staging" | "development"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "enabled" | "disabled"
  >("all");
  const [flags, setFlags] = useState(generateSampleFlags());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);

  const form = useForm<FlagFormValues>({
    resolver: zodResolver(flagFormSchema),
    defaultValues: {
      key: "",
      name: "",
      description: "",
      environment: "development",
      enabled: false,
      enabledPercentage: 100,
      resources: [],
    },
  });

  const availableResources = [
    { id: "api-users", name: "API Users Endpoint", type: "endpoint" },
    { id: "api-payments", name: "API Payments Endpoint", type: "endpoint" },
    { id: "rate-limiter", name: "Rate Limiter Service", type: "service" },
    { id: "cache-layer", name: "Cache Layer", type: "service" },
    { id: "webhook-service", name: "Webhook Service", type: "service" },
    { id: "analytics-db", name: "Analytics Database", type: "database" },
  ];

  const onSubmit = (values: FlagFormValues) => {
    const newFlag: FeatureFlag = {
      id: `flag-${Date.now()}`,
      key: values.key,
      name: values.name,
      description: values.description,
      enabled: values.enabled,
      environment: values.environment,
      createdAt: new Date(),
      updatedAt: new Date(),
      enabledPercentage: values.enabledPercentage,
      targetUsers: values.resources,
    };
    setFlags((prev) => [newFlag, ...prev]);
    form.reset();
    setIsDialogOpen(false);
    setSelectedResources([]);
  };

  const filteredFlags = useMemo(() => {
    return flags.filter((flag) => {
      const matchesSearch =
        flag.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flag.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesEnvironment = environmentFilter === "all" ||
        flag.environment === environmentFilter;

      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "enabled" && flag.enabled) ||
        (statusFilter === "disabled" && !flag.enabled);

      return matchesSearch && matchesEnvironment && matchesStatus;
    });
  }, [flags, searchQuery, environmentFilter, statusFilter]);

  const toggleFlag = (id: string) => {
    setFlags((prev) =>
      prev.map((flag) =>
        flag.id === id
          ? { ...flag, enabled: !flag.enabled, updatedAt: new Date() }
          : flag
      )
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
          <p className="text-muted-foreground mt-1">
            Manage feature flags and control API behavior across environments
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <ToggleRight className="w-4 h-4 mr-2" />
              Create Flag
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Feature Flag</DialogTitle>
              <DialogDescription>
                Configure a new feature flag to control API behavior. Connect
                resources to associate endpoints, services, or databases.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid gap-4 py-4">
                  <FormField
                    control={form.control}
                    name="key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flag Key</FormLabel>
                        <FormControl>
                          <Input placeholder="new-feature-flag" {...field} />
                        </FormControl>
                        <FormDescription>
                          Unique identifier (lowercase, numbers, hyphens only)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flag Name</FormLabel>
                        <FormControl>
                          <Input placeholder="New Feature Flag" {...field} />
                        </FormControl>
                        <FormDescription>
                          Display name for the flag
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Describe what this flag controls..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="environment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Environment</FormLabel>
                          <select
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            {...field}
                          >
                            <option value="development">Development</option>
                            <option value="staging">Staging</option>
                            <option value="production">Production</option>
                          </select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="enabledPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rollout Percentage</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="100"
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Percentage of traffic (0-100)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Enable Flag
                          </FormLabel>
                          <FormDescription>
                            Enable this flag immediately after creation
                          </FormDescription>
                        </div>
                        <FormControl>
                          <button
                            type="button"
                            onClick={() => field.onChange(!field.value)}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              field.value ? "bg-primary" : "bg-muted",
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                field.value ? "translate-x-6" : "translate-x-1",
                              )}
                            />
                          </button>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="space-y-3">
                    <FormLabel>Connect Resources</FormLabel>
                    <FormDescription>
                      Associate this flag with API endpoints, services, or
                      databases
                    </FormDescription>
                    <div className="grid gap-2 border rounded-md p-4 max-h-48 overflow-y-auto">
                      {availableResources.map((resource) => (
                        <div
                          key={resource.id}
                          className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50"
                        >
                          <input
                            type="checkbox"
                            id={resource.id}
                            checked={selectedResources.includes(resource.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedResources([
                                  ...selectedResources,
                                  resource.id,
                                ]);
                                form.setValue("resources", [
                                  ...(form.getValues("resources") || []),
                                  resource.id,
                                ]);
                              } else {
                                setSelectedResources(
                                  selectedResources.filter((id) =>
                                    id !== resource.id
                                  ),
                                );
                                form.setValue(
                                  "resources",
                                  form.getValues("resources")?.filter((id) =>
                                    id !== resource.id
                                  ) || [],
                                );
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <label
                            htmlFor={resource.id}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <LinkIcon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {resource.name}
                              </span>
                              <Badge
                                variant="outline"
                                className="ml-auto text-xs"
                              >
                                {resource.type}
                              </Badge>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      form.reset();
                      setSelectedResources([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create Flag</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Flags</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search flags..."
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
                  variant={statusFilter === "enabled" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("enabled")}
                >
                  Enabled
                </Button>
                <Button
                  variant={statusFilter === "disabled" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("disabled")}
                >
                  Disabled
                </Button>
              </div>
              <div className="flex gap-1">
                <Button
                  variant={environmentFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEnvironmentFilter("all")}
                >
                  All Env
                </Button>
                <Button
                  variant={environmentFilter === "production"
                    ? "default"
                    : "outline"}
                  size="sm"
                  onClick={() => setEnvironmentFilter("production")}
                >
                  Prod
                </Button>
                <Button
                  variant={environmentFilter === "staging"
                    ? "default"
                    : "outline"}
                  size="sm"
                  onClick={() => setEnvironmentFilter("staging")}
                >
                  Staging
                </Button>
                <Button
                  variant={environmentFilter === "development"
                    ? "default"
                    : "outline"}
                  size="sm"
                  onClick={() => setEnvironmentFilter("development")}
                >
                  Dev
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[200px]">Key</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead className="w-[100px]">Rollout</TableHead>
                  <TableHead className="w-[140px]">Updated</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFlags.length === 0
                  ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No flags found matching your filters
                      </TableCell>
                    </TableRow>
                  )
                  : (
                    filteredFlags.map((flag) => (
                      <TableRow
                        key={flag.id}
                        className={cn(
                          flag.enabled &&
                            "bg-green-500/5 hover:bg-green-500/10",
                        )}
                      >
                        <TableCell>
                          <div className="flex items-center">
                            {flag.enabled
                              ? (
                                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                              )
                              : <X className="w-5 h-5 text-muted-foreground" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-xs text-muted-foreground">
                            {flag.key}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{flag.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {flag.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getEnvironmentBadge(flag.environment)}
                        </TableCell>
                        <TableCell>
                          {flag.enabledPercentage !== undefined && (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full transition-all",
                                    flag.enabled
                                      ? "bg-green-600 dark:bg-green-400"
                                      : "bg-muted-foreground/20",
                                  )}
                                  style={{
                                    width: `${flag.enabledPercentage}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {flag.enabledPercentage}%
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(flag.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFlag(flag.id)}
                            className="w-full"
                          >
                            {flag.enabled
                              ? (
                                <>
                                  <ToggleRight className="w-4 h-4 mr-1 text-green-600 dark:text-green-400" />
                                  Disable
                                </>
                              )
                              : (
                                <>
                                  <ToggleLeft className="w-4 h-4 mr-1" />
                                  Enable
                                </>
                              )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredFlags.length} of {flags.length} flags
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
