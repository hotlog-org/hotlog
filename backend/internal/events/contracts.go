package events

import (
	"net/url"
	"strconv"
	"strings"
)

type FieldType string

const (
	FieldTypeString   FieldType = "string"
	FieldTypeNumber   FieldType = "number"
	FieldTypeBoolean  FieldType = "boolean"
	FieldTypeDatetime FieldType = "datetime"
	FieldTypeEnum     FieldType = "enum"
	FieldTypeJSON     FieldType = "json"
	FieldTypeArray    FieldType = "array"
)

var allowedFieldTypes = map[FieldType]struct{}{
	FieldTypeString:   {},
	FieldTypeNumber:   {},
	FieldTypeBoolean:  {},
	FieldTypeDatetime: {},
	FieldTypeEnum:     {},
	FieldTypeJSON:     {},
	FieldTypeArray:    {},
}

type SchemaField struct {
	Key         string    `json:"key"`
	Label       string    `json:"label"`
	Type        FieldType `json:"type"`
	Description string    `json:"description,omitempty"`
	EnumValues  []string  `json:"enumValues,omitempty"`
}

type EventSchema struct {
	ID      string        `json:"id"`
	Name    string        `json:"name"`
	Version string        `json:"version"`
	Fields  []SchemaField `json:"fields"`
}

type EventSource string

const (
	EventSourceAPI       EventSource = "api"
	EventSourceWeb       EventSource = "web"
	EventSourceMobile    EventSource = "mobile"
	EventSourceWorker    EventSource = "worker"
	EventSourceIngestion EventSource = "ingestion"
)

var allowedEventSources = map[EventSource]struct{}{
	EventSourceAPI:       {},
	EventSourceWeb:       {},
	EventSourceMobile:    {},
	EventSourceWorker:    {},
	EventSourceIngestion: {},
}

type EventStatus string

const (
	EventStatusIngested EventStatus = "ingested"
	EventStatusWarning  EventStatus = "warning"
	EventStatusError    EventStatus = "error"
	EventStatusMuted    EventStatus = "muted"
)

var allowedEventStatuses = map[EventStatus]struct{}{
	EventStatusIngested: {},
	EventStatusWarning:  {},
	EventStatusError:    {},
	EventStatusMuted:    {},
}

type EventRecord struct {
	ID        string                 `json:"id"`
	Title     string                 `json:"title"`
	SchemaID  string                 `json:"schemaId"`
	Source    EventSource            `json:"source"`
	Status    EventStatus            `json:"status"`
	CreatedAt string                 `json:"createdAt"`
	Payload   map[string]interface{} `json:"payload"`
}

type EventListQuery struct {
	Search    string
	SchemaIDs []string
	Limit     int
	Offset    int
}

type EventListResult struct {
	Items []EventRecord `json:"items"`
	Total int           `json:"total"`
}

type EventCreatePayload struct {
	Title    string                 `json:"title"`
	SchemaID string                 `json:"schemaId"`
	Source   EventSource            `json:"source"`
	Status   EventStatus            `json:"status"`
	Payload  map[string]interface{} `json:"payload"`
}

type EventUpdatePayload struct {
	Title    string                 `json:"title"`
	SchemaID string                 `json:"schemaId"`
	Source   EventSource            `json:"source"`
	Status   EventStatus            `json:"status"`
	Payload  map[string]interface{} `json:"payload"`
}

type EventSchemaCreatePayload struct {
	ID      string        `json:"id,omitempty"`
	Name    string        `json:"name"`
	Version string        `json:"version"`
	Fields  []SchemaField `json:"fields"`
}

type EventSchemaUpdatePayload struct {
	Name    string        `json:"name"`
	Version string        `json:"version"`
	Fields  []SchemaField `json:"fields"`
}

type EventSchemasResult struct {
	Items []EventSchema `json:"items"`
}

type ValidationDetails map[string][]string

func (details ValidationDetails) Add(field string, message string) {
	details[field] = append(details[field], message)
}

func (details ValidationDetails) HasErrors() bool {
	return len(details) > 0
}

func ParseEventListQuery(values url.Values) (EventListQuery, ValidationDetails) {
	query := EventListQuery{
		Limit:  200,
		Offset: 0,
	}

	details := ValidationDetails{}
	query.Search = strings.TrimSpace(values.Get("search"))
	query.SchemaIDs = parseSchemaIDs(values["schemaIds"])

	if rawLimit := strings.TrimSpace(values.Get("limit")); rawLimit != "" {
		limit, err := strconv.Atoi(rawLimit)
		if err != nil {
			details.Add("limit", "must be an integer")
		} else if limit < 1 || limit > 500 {
			details.Add("limit", "must be between 1 and 500")
		} else {
			query.Limit = limit
		}
	}

	if rawOffset := strings.TrimSpace(values.Get("offset")); rawOffset != "" {
		offset, err := strconv.Atoi(rawOffset)
		if err != nil {
			details.Add("offset", "must be an integer")
		} else if offset < 0 {
			details.Add("offset", "must be greater than or equal to 0")
		} else {
			query.Offset = offset
		}
	}

	return query, details
}

func ApplyDefaultsToEventCreatePayload(payload *EventCreatePayload) {
	applyEventPayloadDefaults(&payload.Title, &payload.SchemaID, &payload.Status, &payload.Payload)
}

func ValidateEventCreatePayload(payload EventCreatePayload) ValidationDetails {
	return validateEventPayload(payload.Title, payload.SchemaID, payload.Source, payload.Status)
}

func ApplyDefaultsToEventUpdatePayload(payload *EventUpdatePayload) {
	applyEventPayloadDefaults(&payload.Title, &payload.SchemaID, &payload.Status, &payload.Payload)
}

func ValidateEventUpdatePayload(payload EventUpdatePayload) ValidationDetails {
	return validateEventPayload(payload.Title, payload.SchemaID, payload.Source, payload.Status)
}

func applyEventPayloadDefaults(
	title *string,
	schemaID *string,
	status *EventStatus,
	payload *map[string]interface{},
) {
	*title = strings.TrimSpace(*title)
	*schemaID = strings.TrimSpace(*schemaID)

	if *status == "" {
		*status = EventStatusIngested
	}

	if *payload == nil {
		*payload = map[string]interface{}{}
	}
}

func validateEventPayload(
	title string,
	schemaID string,
	source EventSource,
	status EventStatus,
) ValidationDetails {
	details := ValidationDetails{}

	if title == "" {
		details.Add("title", "is required")
	}

	if schemaID == "" {
		details.Add("schemaId", "is required")
	}

	if _, ok := allowedEventSources[source]; !ok {
		details.Add("source", "must be one of: api, web, mobile, worker, ingestion")
	}

	if _, ok := allowedEventStatuses[status]; !ok {
		details.Add("status", "must be one of: ingested, warning, error, muted")
	}

	return details
}

func NormalizeEventSchemaPayload(payload *EventSchemaCreatePayload) {
	payload.ID = strings.TrimSpace(payload.ID)
	payload.Name = strings.TrimSpace(payload.Name)
	payload.Version = strings.TrimSpace(payload.Version)
}

func ValidateEventSchemaCreatePayload(
	payload EventSchemaCreatePayload,
) ValidationDetails {
	return validateSchemaFields(payload.Name, payload.Version, payload.Fields)
}

func NormalizeEventSchemaUpdatePayload(payload *EventSchemaUpdatePayload) {
	payload.Name = strings.TrimSpace(payload.Name)
	payload.Version = strings.TrimSpace(payload.Version)
}

func ValidateEventSchemaUpdatePayload(
	payload EventSchemaUpdatePayload,
) ValidationDetails {
	return validateSchemaFields(payload.Name, payload.Version, payload.Fields)
}

func validateSchemaFields(
	name string,
	version string,
	fields []SchemaField,
) ValidationDetails {
	details := ValidationDetails{}

	if name == "" {
		details.Add("name", "is required")
	}

	if version == "" {
		details.Add("version", "is required")
	}

	if len(fields) == 0 {
		details.Add("fields", "must contain at least one field")
	}

	for index, field := range fields {
		if strings.TrimSpace(field.Key) == "" {
			details.Add("fields", "field key is required at index "+strconv.Itoa(index))
		}

		if strings.TrimSpace(field.Label) == "" {
			details.Add("fields", "field label is required at index "+strconv.Itoa(index))
		}

		if _, ok := allowedFieldTypes[field.Type]; !ok {
			details.Add(
				"fields",
				"field type is invalid at index "+strconv.Itoa(index),
			)
		}
	}

	return details
}

func parseSchemaIDs(rawValues []string) []string {
	parsed := make([]string, 0)

	for _, rawValue := range rawValues {
		parts := strings.Split(rawValue, ",")
		for _, part := range parts {
			schemaID := strings.TrimSpace(part)
			if schemaID == "" {
				continue
			}
			parsed = append(parsed, schemaID)
		}
	}

	if len(parsed) == 0 {
		return nil
	}

	return parsed
}
