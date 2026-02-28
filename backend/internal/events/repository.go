package events

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrSchemaNotFound     = errors.New("event schema not found")
	ErrSchemaAlreadyExist = errors.New("event schema already exists")
	ErrSchemaForbidden    = errors.New("event schema forbidden")
	ErrEventNotFound      = errors.New("event not found")
	ErrEventForbidden     = errors.New("event forbidden")
)

type Repository interface {
	ListEventSchemas(ctx context.Context, userID string) ([]EventSchema, error)
	GetEventSchemaByID(
		ctx context.Context,
		userID string,
		schemaID string,
	) (EventSchema, error)
	ListEventsForUser(
		ctx context.Context,
		userID string,
		query EventListQuery,
	) (EventListResult, error)
	GetEventByID(ctx context.Context, userID string, eventID string) (EventRecord, error)
	CreateEventSchema(
		ctx context.Context,
		userID string,
		payload EventSchemaCreatePayload,
	) (EventSchema, error)
	UpdateEventSchema(
		ctx context.Context,
		userID string,
		schemaID string,
		payload EventSchemaUpdatePayload,
	) (EventSchema, error)
	DeleteEventSchema(ctx context.Context, userID string, schemaID string) error
	CreateEventRecord(
		ctx context.Context,
		userID string,
		payload EventCreatePayload,
	) (EventRecord, error)
	UpdateEventRecord(
		ctx context.Context,
		userID string,
		eventID string,
		payload EventUpdatePayload,
	) (EventRecord, error)
	DeleteEventRecord(ctx context.Context, userID string, eventID string) error
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

type eventSchemaRow struct {
	ID      string
	Name    string
	Version string
	Fields  []byte
}

type eventRecordRow struct {
	ID        string
	SchemaID  string
	Title     string
	Source    string
	Status    string
	Payload   []byte
	CreatedAt time.Time
}

var schemaIDPattern = regexp.MustCompile(`[^a-z0-9]+`)

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (repo *PostgresRepository) ListEventSchemas(
	ctx context.Context,
	userID string,
) ([]EventSchema, error) {
	rows, err := repo.pool.Query(
		ctx,
		`SELECT id, name, version, fields
		 FROM event_schemas
		 WHERE user_id = $1
		 ORDER BY name`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]EventSchema, 0)
	for rows.Next() {
		var row eventSchemaRow
		if err := rows.Scan(&row.ID, &row.Name, &row.Version, &row.Fields); err != nil {
			return nil, err
		}

		items = append(items, mapSchemaRow(row))
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return items, nil
}

func (repo *PostgresRepository) GetEventSchemaByID(
	ctx context.Context,
	userID string,
	schemaID string,
) (EventSchema, error) {
	var ownerID string
	var row eventSchemaRow
	err := repo.pool.QueryRow(
		ctx,
		`SELECT user_id, id, name, version, fields
		 FROM event_schemas
		 WHERE id = $1`,
		schemaID,
	).Scan(&ownerID, &row.ID, &row.Name, &row.Version, &row.Fields)

	if errors.Is(err, pgx.ErrNoRows) {
		return EventSchema{}, ErrSchemaNotFound
	}

	if err != nil {
		return EventSchema{}, err
	}

	if ownerID != userID {
		return EventSchema{}, ErrSchemaForbidden
	}

	return mapSchemaRow(row), nil
}

func (repo *PostgresRepository) ListEventsForUser(
	ctx context.Context,
	userID string,
	query EventListQuery,
) (EventListResult, error) {
	whereValues := []interface{}{userID}
	whereClause := buildEventListWhereClause(query, &whereValues)

	totalSQL := fmt.Sprintf(
		`SELECT COUNT(*)::int AS total
		 FROM events e
		 LEFT JOIN event_schemas es ON es.id = e.schema_id
		 %s`,
		whereClause,
	)

	var total int
	if err := repo.pool.QueryRow(ctx, totalSQL, whereValues...).Scan(&total); err != nil {
		return EventListResult{}, err
	}

	listValues := append(whereValues, query.Limit, query.Offset)
	listSQL := fmt.Sprintf(
		`SELECT e.id, e.schema_id, e.title, e.source, e.status, e.payload, e.created_at
		 FROM events e
		 LEFT JOIN event_schemas es ON es.id = e.schema_id
		 %s
		 ORDER BY e.created_at DESC
		 LIMIT $%d OFFSET $%d`,
		whereClause,
		len(whereValues)+1,
		len(whereValues)+2,
	)

	rows, err := repo.pool.Query(ctx, listSQL, listValues...)
	if err != nil {
		return EventListResult{}, err
	}
	defer rows.Close()

	items := make([]EventRecord, 0)
	for rows.Next() {
		var row eventRecordRow
		if err := rows.Scan(
			&row.ID,
			&row.SchemaID,
			&row.Title,
			&row.Source,
			&row.Status,
			&row.Payload,
			&row.CreatedAt,
		); err != nil {
			return EventListResult{}, err
		}

		items = append(items, mapEventRow(row))
	}

	if err := rows.Err(); err != nil {
		return EventListResult{}, err
	}

	return EventListResult{
		Items: items,
		Total: total,
	}, nil
}

func (repo *PostgresRepository) GetEventByID(
	ctx context.Context,
	userID string,
	eventID string,
) (EventRecord, error) {
	var ownerID string
	var row eventRecordRow
	err := repo.pool.QueryRow(
		ctx,
		`SELECT user_id, id, schema_id, title, source, status, payload, created_at
		 FROM events
		 WHERE id = $1`,
		eventID,
	).Scan(
		&ownerID,
		&row.ID,
		&row.SchemaID,
		&row.Title,
		&row.Source,
		&row.Status,
		&row.Payload,
		&row.CreatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return EventRecord{}, ErrEventNotFound
	}

	if err != nil {
		return EventRecord{}, err
	}

	if ownerID != userID {
		return EventRecord{}, ErrEventForbidden
	}

	return mapEventRow(row), nil
}

func (repo *PostgresRepository) CreateEventSchema(
	ctx context.Context,
	userID string,
	payload EventSchemaCreatePayload,
) (EventSchema, error) {
	candidateID := ensureSchemaID(payload.ID, payload.Name)

	var existingID string
	err := repo.pool.QueryRow(
		ctx,
		`SELECT id FROM event_schemas WHERE id = $1`,
		candidateID,
	).Scan(&existingID)

	if err == nil {
		return EventSchema{}, ErrSchemaAlreadyExist
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		return EventSchema{}, err
	}

	fields, err := json.Marshal(payload.Fields)
	if err != nil {
		return EventSchema{}, err
	}

	var row eventSchemaRow
	err = repo.pool.QueryRow(
		ctx,
		`INSERT INTO event_schemas (id, user_id, name, version, fields)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, name, version, fields`,
		candidateID,
		userID,
		payload.Name,
		payload.Version,
		fields,
	).Scan(&row.ID, &row.Name, &row.Version, &row.Fields)
	if err != nil {
		return EventSchema{}, err
	}

	return mapSchemaRow(row), nil
}

func (repo *PostgresRepository) CreateEventRecord(
	ctx context.Context,
	userID string,
	payload EventCreatePayload,
) (EventRecord, error) {
	var schemaID string
	err := repo.pool.QueryRow(
		ctx,
		`SELECT id FROM event_schemas WHERE id = $1 AND user_id = $2`,
		payload.SchemaID,
		userID,
	).Scan(&schemaID)

	if errors.Is(err, pgx.ErrNoRows) {
		return EventRecord{}, ErrSchemaNotFound
	}

	if err != nil {
		return EventRecord{}, err
	}

	payloadJSON, err := json.Marshal(payload.Payload)
	if err != nil {
		return EventRecord{}, err
	}

	var row eventRecordRow
	err = repo.pool.QueryRow(
		ctx,
		`INSERT INTO events (id, user_id, schema_id, title, source, status, payload)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, schema_id, title, source, status, payload, created_at`,
		uuid.NewString(),
		userID,
		payload.SchemaID,
		payload.Title,
		payload.Source,
		payload.Status,
		payloadJSON,
	).Scan(
		&row.ID,
		&row.SchemaID,
		&row.Title,
		&row.Source,
		&row.Status,
		&row.Payload,
		&row.CreatedAt,
	)
	if err != nil {
		return EventRecord{}, err
	}

	return mapEventRow(row), nil
}

func (repo *PostgresRepository) UpdateEventRecord(
	ctx context.Context,
	userID string,
	eventID string,
	payload EventUpdatePayload,
) (EventRecord, error) {
	ownerID, err := repo.getEventOwner(ctx, eventID)
	if err != nil {
		return EventRecord{}, err
	}

	if ownerID != userID {
		return EventRecord{}, ErrEventForbidden
	}

	if err := repo.ensureSchemaOwnedByUser(ctx, userID, payload.SchemaID); err != nil {
		return EventRecord{}, err
	}

	payloadJSON, err := json.Marshal(payload.Payload)
	if err != nil {
		return EventRecord{}, err
	}

	var row eventRecordRow
	err = repo.pool.QueryRow(
		ctx,
		`UPDATE events
		 SET schema_id = $1,
		     title = $2,
		     source = $3,
		     status = $4,
		     payload = $5
		 WHERE id = $6
		 RETURNING id, schema_id, title, source, status, payload, created_at`,
		payload.SchemaID,
		payload.Title,
		payload.Source,
		payload.Status,
		payloadJSON,
		eventID,
	).Scan(
		&row.ID,
		&row.SchemaID,
		&row.Title,
		&row.Source,
		&row.Status,
		&row.Payload,
		&row.CreatedAt,
	)
	if err != nil {
		return EventRecord{}, err
	}

	return mapEventRow(row), nil
}

func (repo *PostgresRepository) DeleteEventRecord(
	ctx context.Context,
	userID string,
	eventID string,
) error {
	ownerID, err := repo.getEventOwner(ctx, eventID)
	if err != nil {
		return err
	}

	if ownerID != userID {
		return ErrEventForbidden
	}

	_, err = repo.pool.Exec(ctx, `DELETE FROM events WHERE id = $1`, eventID)
	if err != nil {
		return err
	}

	return nil
}

func (repo *PostgresRepository) UpdateEventSchema(
	ctx context.Context,
	userID string,
	schemaID string,
	payload EventSchemaUpdatePayload,
) (EventSchema, error) {
	var ownerID string
	err := repo.pool.QueryRow(
		ctx,
		`SELECT user_id FROM event_schemas WHERE id = $1`,
		schemaID,
	).Scan(&ownerID)

	if errors.Is(err, pgx.ErrNoRows) {
		return EventSchema{}, ErrSchemaNotFound
	}

	if err != nil {
		return EventSchema{}, err
	}

	if ownerID != userID {
		return EventSchema{}, ErrSchemaForbidden
	}

	fields, err := json.Marshal(payload.Fields)
	if err != nil {
		return EventSchema{}, err
	}

	var row eventSchemaRow
	err = repo.pool.QueryRow(
		ctx,
		`UPDATE event_schemas
		 SET name = $1,
		     version = $2,
		     fields = $3,
		     updated_at = CURRENT_TIMESTAMP
		 WHERE id = $4
		 RETURNING id, name, version, fields`,
		payload.Name,
		payload.Version,
		fields,
		schemaID,
	).Scan(&row.ID, &row.Name, &row.Version, &row.Fields)
	if err != nil {
		return EventSchema{}, err
	}

	return mapSchemaRow(row), nil
}

func (repo *PostgresRepository) DeleteEventSchema(
	ctx context.Context,
	userID string,
	schemaID string,
) error {
	commandTag, err := repo.pool.Exec(
		ctx,
		`DELETE FROM event_schemas WHERE id = $1 AND user_id = $2`,
		schemaID,
		userID,
	)
	if err != nil {
		return err
	}

	if commandTag.RowsAffected() == 0 {
		var existingID string
		err := repo.pool.QueryRow(
			ctx,
			`SELECT id FROM event_schemas WHERE id = $1`,
			schemaID,
		).Scan(&existingID)

		if errors.Is(err, pgx.ErrNoRows) {
			return ErrSchemaNotFound
		}

		if err != nil {
			return err
		}

		return ErrSchemaForbidden
	}

	return nil
}

func (repo *PostgresRepository) ensureSchemaOwnedByUser(
	ctx context.Context,
	userID string,
	schemaID string,
) error {
	var ownerID string
	err := repo.pool.QueryRow(
		ctx,
		`SELECT user_id FROM event_schemas WHERE id = $1`,
		schemaID,
	).Scan(&ownerID)

	if errors.Is(err, pgx.ErrNoRows) {
		return ErrSchemaNotFound
	}

	if err != nil {
		return err
	}

	if ownerID != userID {
		return ErrSchemaForbidden
	}

	return nil
}

func (repo *PostgresRepository) getEventOwner(
	ctx context.Context,
	eventID string,
) (string, error) {
	var ownerID string
	err := repo.pool.QueryRow(
		ctx,
		`SELECT user_id FROM events WHERE id = $1`,
		eventID,
	).Scan(&ownerID)

	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrEventNotFound
	}

	if err != nil {
		return "", err
	}

	return ownerID, nil
}

func buildEventListWhereClause(query EventListQuery, values *[]interface{}) string {
	clauses := []string{"e.user_id = $1"}

	if len(query.SchemaIDs) > 0 {
		*values = append(*values, query.SchemaIDs)
		placeholder := len(*values)
		clauses = append(
			clauses,
			fmt.Sprintf("e.schema_id = ANY($%d::text[])", placeholder),
		)
	}

	if query.Search != "" {
		search := "%" + strings.ToLower(strings.TrimSpace(query.Search)) + "%"
		*values = append(*values, search)
		placeholder := len(*values)
		clauses = append(
			clauses,
			fmt.Sprintf(
				"(LOWER(e.title) LIKE $%d OR LOWER(COALESCE(es.name, '')) LIKE $%d OR LOWER(COALESCE(e.payload::text, '')) LIKE $%d)",
				placeholder,
				placeholder,
				placeholder,
			),
		)
	}

	return "WHERE " + strings.Join(clauses, " AND ")
}

func mapSchemaRow(row eventSchemaRow) EventSchema {
	fields := make([]SchemaField, 0)
	if len(row.Fields) > 0 {
		_ = json.Unmarshal(row.Fields, &fields)
	}

	return EventSchema{
		ID:      row.ID,
		Name:    row.Name,
		Version: row.Version,
		Fields:  fields,
	}
}

func mapEventRow(row eventRecordRow) EventRecord {
	payload := map[string]interface{}{}
	if len(row.Payload) > 0 {
		_ = json.Unmarshal(row.Payload, &payload)
	}

	return EventRecord{
		ID:        row.ID,
		Title:     row.Title,
		SchemaID:  row.SchemaID,
		Source:    EventSource(row.Source),
		Status:    EventStatus(row.Status),
		CreatedAt: row.CreatedAt.UTC().Format(time.RFC3339),
		Payload:   payload,
	}
}

func ensureSchemaID(rawID string, fallbackName string) string {
	base := strings.TrimSpace(strings.ToLower(rawID))
	if base == "" {
		base = strings.TrimSpace(strings.ToLower(fallbackName))
	}

	slug := schemaIDPattern.ReplaceAllString(base, "-")
	slug = strings.Trim(slug, "-")

	if slug == "" {
		id := uuid.NewString()
		if len(id) > 8 {
			id = id[:8]
		}
		return "schema-" + id
	}

	return slug
}
