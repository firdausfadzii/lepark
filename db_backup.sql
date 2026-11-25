--
-- PostgreSQL database dump
--

\restrict AxJ2hu9tpBvX0OYldJIbQtThgR7d6tvBPPIG5iKvMgzJYNVbfJrJCK82sQUjM0K

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.spaces DROP CONSTRAINT IF EXISTS spaces_owner_id_fkey;
ALTER TABLE IF EXISTS ONLY public.space_inventories DROP CONSTRAINT IF EXISTS space_inventories_space_id_fkey;
ALTER TABLE IF EXISTS ONLY public.space_inventories DROP CONSTRAINT IF EXISTS space_inventories_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.rpg_trade_offers DROP CONSTRAINT IF EXISTS rpg_trade_offers_sender_id_fkey;
ALTER TABLE IF EXISTS ONLY public.rpg_profiles DROP CONSTRAINT IF EXISTS rpg_profiles_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.organisations DROP CONSTRAINT IF EXISTS organisations_creator_id_fkey;
ALTER TABLE IF EXISTS ONLY public.organisation_members DROP CONSTRAINT IF EXISTS organisation_members_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.organisation_members DROP CONSTRAINT IF EXISTS organisation_members_organisation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notes DROP CONSTRAINT IF EXISTS notes_space_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notes DROP CONSTRAINT IF EXISTS notes_organisation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notes DROP CONSTRAINT IF EXISTS notes_author_id_fkey;
ALTER TABLE IF EXISTS ONLY public.friendships DROP CONSTRAINT IF EXISTS friendships_requester_id_fkey;
ALTER TABLE IF EXISTS ONLY public.friendships DROP CONSTRAINT IF EXISTS friendships_addressee_id_fkey;
ALTER TABLE IF EXISTS ONLY public.calendar_meals DROP CONSTRAINT IF EXISTS calendar_meals_space_id_fkey;
ALTER TABLE IF EXISTS ONLY public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_space_id_fkey;
ALTER TABLE IF EXISTS ONLY public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_organisation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_author_id_fkey;
DROP INDEX IF EXISTS public.idx_users_username_lower;
DROP INDEX IF EXISTS public.idx_users_email_lower;
DROP INDEX IF EXISTS public.idx_spaces_superadmin_name;
DROP INDEX IF EXISTS public.idx_spaces_superadmin;
DROP INDEX IF EXISTS public.idx_space_inventories_space;
DROP INDEX IF EXISTS public.idx_rpg_trade_squad;
DROP INDEX IF EXISTS public.idx_players_last_seen;
DROP INDEX IF EXISTS public.idx_organisations_name_lower;
DROP INDEX IF EXISTS public.idx_org_members_user;
DROP INDEX IF EXISTS public.idx_notes_type_author;
DROP INDEX IF EXISTS public.idx_notes_space;
DROP INDEX IF EXISTS public.idx_notes_org;
DROP INDEX IF EXISTS public.idx_friendships_requester;
DROP INDEX IF EXISTS public.idx_friendships_addressee;
DROP INDEX IF EXISTS public.idx_chat_messages_room;
DROP INDEX IF EXISTS public.idx_cal_events_type_author;
DROP INDEX IF EXISTS public.idx_cal_events_space;
DROP INDEX IF EXISTS public.idx_cal_events_org;
DROP INDEX IF EXISTS public.idx_cal_events_dates;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.spaces DROP CONSTRAINT IF EXISTS spaces_pkey;
ALTER TABLE IF EXISTS ONLY public.space_inventories DROP CONSTRAINT IF EXISTS space_inventories_pkey;
ALTER TABLE IF EXISTS ONLY public.rpg_trade_offers DROP CONSTRAINT IF EXISTS rpg_trade_offers_pkey;
ALTER TABLE IF EXISTS ONLY public.rpg_raid_state DROP CONSTRAINT IF EXISTS rpg_raid_state_pkey;
ALTER TABLE IF EXISTS ONLY public.rpg_profiles DROP CONSTRAINT IF EXISTS rpg_profiles_pkey;
ALTER TABLE IF EXISTS ONLY public.players DROP CONSTRAINT IF EXISTS players_pkey;
ALTER TABLE IF EXISTS ONLY public.organisations DROP CONSTRAINT IF EXISTS organisations_pkey;
ALTER TABLE IF EXISTS ONLY public.organisation_members DROP CONSTRAINT IF EXISTS organisation_members_pkey;
ALTER TABLE IF EXISTS ONLY public.organisation_members DROP CONSTRAINT IF EXISTS organisation_members_organisation_id_user_id_key;
ALTER TABLE IF EXISTS ONLY public.notes DROP CONSTRAINT IF EXISTS notes_pkey;
ALTER TABLE IF EXISTS ONLY public.friendships DROP CONSTRAINT IF EXISTS friendships_requester_id_addressee_id_key;
ALTER TABLE IF EXISTS ONLY public.friendships DROP CONSTRAINT IF EXISTS friendships_pkey;
ALTER TABLE IF EXISTS ONLY public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_pkey;
ALTER TABLE IF EXISTS ONLY public.calendar_meals DROP CONSTRAINT IF EXISTS calendar_meals_pkey;
ALTER TABLE IF EXISTS ONLY public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.space_inventories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.organisations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.organisation_members ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.notes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.friendships ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.calendar_events ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.spaces;
DROP SEQUENCE IF EXISTS public.space_inventories_id_seq;
DROP TABLE IF EXISTS public.space_inventories;
DROP TABLE IF EXISTS public.rpg_trade_offers;
DROP TABLE IF EXISTS public.rpg_raid_state;
DROP TABLE IF EXISTS public.rpg_profiles;
DROP TABLE IF EXISTS public.players;
DROP SEQUENCE IF EXISTS public.organisations_id_seq;
DROP TABLE IF EXISTS public.organisations;
DROP SEQUENCE IF EXISTS public.organisation_members_id_seq;
DROP TABLE IF EXISTS public.organisation_members;
DROP SEQUENCE IF EXISTS public.notes_id_seq;
DROP TABLE IF EXISTS public.notes;
DROP SEQUENCE IF EXISTS public.friendships_id_seq;
DROP TABLE IF EXISTS public.friendships;
DROP TABLE IF EXISTS public.chat_messages;
DROP TABLE IF EXISTS public.calendar_meals;
DROP SEQUENCE IF EXISTS public.calendar_events_id_seq;
DROP TABLE IF EXISTS public.calendar_events;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_events (
    id integer NOT NULL,
    type character varying(20) NOT NULL,
    title character varying(200) NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    start_date character varying(10) NOT NULL,
    end_date character varying(10) NOT NULL,
    is_all_day boolean DEFAULT true NOT NULL,
    start_time character varying(5),
    end_time character varying(5),
    author_id integer NOT NULL,
    space_id character varying(64),
    organisation_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    repeat_count integer,
    repeat_unit character varying(10),
    repeat_interval integer,
    assignee_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    rotate_assignees boolean DEFAULT false NOT NULL,
    images jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: calendar_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calendar_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calendar_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calendar_events_id_seq OWNED BY public.calendar_events.id;


--
-- Name: calendar_meals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_meals (
    space_id character varying(64) NOT NULL,
    day_of_week smallint NOT NULL,
    meal_name character varying(200) DEFAULT ''::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT calendar_meals_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id character varying(64) NOT NULL,
    sender_id character varying(64) NOT NULL,
    sender_name character varying(50) NOT NULL,
    sender_color character varying(30) DEFAULT '#3b82f6'::character varying,
    is_superadmin boolean DEFAULT false,
    room_type character varying(20) NOT NULL,
    room_id character varying(64) NOT NULL,
    room_name character varying(100),
    target_id character varying(64),
    target_name character varying(50),
    text text NOT NULL,
    "timestamp" bigint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: friendships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friendships (
    id integer NOT NULL,
    requester_id integer NOT NULL,
    addressee_id integer NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: friendships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.friendships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: friendships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.friendships_id_seq OWNED BY public.friendships.id;


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id integer NOT NULL,
    type character varying(20) NOT NULL,
    title character varying(200) NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    author_id integer NOT NULL,
    space_id character varying(64),
    organisation_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    images jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notes_id_seq OWNED BY public.notes.id;


--
-- Name: organisation_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organisation_members (
    id integer NOT NULL,
    organisation_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: organisation_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organisation_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organisation_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organisation_members_id_seq OWNED BY public.organisation_members.id;


--
-- Name: organisations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organisations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    logo text,
    creator_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: organisations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organisations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organisations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organisations_id_seq OWNED BY public.organisations.id;


--
-- Name: players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.players (
    id character varying(64) NOT NULL,
    name character varying(50) NOT NULL,
    color character varying(30) NOT NULL,
    x double precision DEFAULT 400,
    y double precision DEFAULT 300,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_seen timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: rpg_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rpg_profiles (
    user_id integer NOT NULL,
    profile_json jsonb NOT NULL,
    power_score text DEFAULT '0'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: rpg_raid_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rpg_raid_state (
    week_key character varying(16) NOT NULL,
    raid_json jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: rpg_trade_offers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rpg_trade_offers (
    offer_id character varying(64) NOT NULL,
    squad_id character varying(64) NOT NULL,
    sender_id integer NOT NULL,
    offer_json jsonb NOT NULL,
    expires_at bigint NOT NULL,
    created_at bigint NOT NULL
);


--
-- Name: space_inventories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.space_inventories (
    id integer NOT NULL,
    space_id character varying(64) NOT NULL,
    name character varying(200) NOT NULL,
    bought boolean DEFAULT false NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: space_inventories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.space_inventories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: space_inventories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.space_inventories_id_seq OWNED BY public.space_inventories.id;


--
-- Name: spaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spaces (
    id character varying(64) NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(50) DEFAULT 'General'::character varying,
    owner_id integer,
    is_public boolean DEFAULT true,
    is_superadmin_space boolean DEFAULT false,
    whitelist jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    tiles jsonb DEFAULT '{}'::jsonb,
    private_zones jsonb DEFAULT '[]'::jsonb,
    jukeboxes jsonb DEFAULT '[]'::jsonb,
    typewriters jsonb DEFAULT '[]'::jsonb,
    ashtrays jsonb DEFAULT '[]'::jsonb,
    chess_boards jsonb DEFAULT '[]'::jsonb,
    aquariums jsonb DEFAULT '[]'::jsonb,
    shared_owners jsonb DEFAULT '[]'::jsonb,
    inventories jsonb DEFAULT '[]'::jsonb,
    focus_theme character varying(32) DEFAULT 'auto'::character varying NOT NULL,
    seller_npc jsonb
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    display_name character varying(50),
    password_hash character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    role character varying(20) DEFAULT 'user'::character varying,
    parking_points integer DEFAULT 0 NOT NULL,
    unlocked_skins jsonb DEFAULT '[]'::jsonb,
    email character varying(255),
    unlocked_assets jsonb DEFAULT '[]'::jsonb,
    last_space_id character varying(64),
    last_x double precision,
    last_y double precision,
    focus_points integer DEFAULT 0 NOT NULL,
    focus_streak_days integer DEFAULT 0 NOT NULL,
    last_focus_date character varying(10),
    focus_freeze_shields integer DEFAULT 2 NOT NULL,
    focus_shield_week character varying(10),
    daily_focus_date character varying(10),
    daily_focus_minutes integer DEFAULT 0 NOT NULL,
    last_public_space_id character varying(64)
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: calendar_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events ALTER COLUMN id SET DEFAULT nextval('public.calendar_events_id_seq'::regclass);


--
-- Name: friendships id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships ALTER COLUMN id SET DEFAULT nextval('public.friendships_id_seq'::regclass);


--
-- Name: notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes ALTER COLUMN id SET DEFAULT nextval('public.notes_id_seq'::regclass);


--
-- Name: organisation_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisation_members ALTER COLUMN id SET DEFAULT nextval('public.organisation_members_id_seq'::regclass);


--
-- Name: organisations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisations ALTER COLUMN id SET DEFAULT nextval('public.organisations_id_seq'::regclass);


--
-- Name: space_inventories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_inventories ALTER COLUMN id SET DEFAULT nextval('public.space_inventories_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.calendar_events (id, type, title, description, start_date, end_date, is_all_day, start_time, end_time, author_id, space_id, organisation_id, created_at, updated_at, repeat_count, repeat_unit, repeat_interval, assignee_ids, rotate_assignees, images) FROM stdin;
\.


--
-- Data for Name: calendar_meals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.calendar_meals (space_id, day_of_week, meal_name, updated_at) FROM stdin;
user_space_15	0	Nasi Lemak	2026-11-17 08:17:16.100254+00
user_space_8	0	Nasi Lemak	2026-11-21 07:07:22.311509+00
user_space_8	1	Ayam Gepuk	2026-11-21 07:07:26.727942+00
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chat_messages (id, sender_id, sender_name, sender_color, is_superadmin, room_type, room_id, room_name, target_id, target_name, text, "timestamp", created_at) FROM stdin;
msg_1792571188674_lquuz	XEwMbYw8A	Who am U	#3B8282	f	map	space_central_plaza	Map Chat	\N	\N	Hello	1792571188674	2026-10-21 08:26:28.675962+00
msg_1793266730771_xdrv4	s4tO9rmXN	Admin	#3B8282	t	map	space_central_plaza	Map Chat	\N	\N	🎣 Caught a GOLD Goldfish (6.8 in) at the Aquarium!	1793266730771	2026-10-29 09:38:50.772202+00
msg_1793267093660_r06ww	s4tO9rmXN	Admin	#3B8282	t	map	space_central_plaza	Map Chat	\N	\N	🎣 Caught a GOLD Worm (3.5 in) at the Aquarium!	1793267093660	2026-10-29 09:44:53.662162+00
msg_1793267347995_ypkvx	Wx8wjmj7B	HEHE	#3B8282	f	map	space_central_plaza	Map Chat	\N	\N	🎣 Caught a GOLD Rusty Can (6.3 in) at the Aquarium!	1793267347995	2026-10-29 09:49:07.995513+00
msg_1793267800322_k2hx9	eojfHjCyv	HEHE	#3B8282	f	map	space_central_plaza	Map Chat	\N	\N	🎣 Caught a GOLD Worm (4.5 in) at the Aquarium!	1793267800322	2026-10-29 09:56:40.323543+00
msg_1793268677142_5tpct	2RBtDU0U-	Admin	#3B8282	f	map	space_central_plaza	Map Chat	\N	\N	🎣 Caught a GOLD Rusty Can (6 in) at the Aquarium!	1793268677142	2026-10-29 10:11:17.143245+00
msg_1793268882127_0br7c	2RBtDU0U-	Admin	#3B8282	f	map	space_central_plaza	Map Chat	\N	\N	🎣 Caught a GOLD Worm (2.8 in) at the Aquarium!	1793268882127	2026-10-29 10:14:42.127891+00
msg_1793268937811_8z4pq	2RBtDU0U-	Admin	#3B8282	f	map	space_central_plaza	Map Chat	\N	\N	🎣 Caught a GOLD Angelfish (6.8 in) at the Aquarium!	1793268937811	2026-10-29 10:15:37.812589+00
msg_1793268961921_ww940	2RBtDU0U-	Admin	#3B8282	f	map	space_central_plaza	Map Chat	\N	\N	🎣 Caught a GOLD Goldfish (6.7 in) at the Aquarium!	1793268961921	2026-10-29 10:16:01.921214+00
msg_1794817744431_2eo9m	3GCBvFJVh	Dauss	#3B8282	f	map	space_central_plaza	Map Chat	\N	\N	hello	1794817744431	2026-11-16 08:29:04.432794+00
msg_1794817750317_b0s0c	n2feMgM-i	Admin	#3B8282	t	map	space_central_plaza	Map Chat	\N	\N	wazzap	1794817750317	2026-11-16 08:29:10.318551+00
msg_1794882715691_n3k0o	SUIltQZED	HEHE	#3B8282	f	whisper	HEcSi8_wi	Dauss	HEcSi8_wi	Dauss	hehe	1794882715691	2026-11-17 02:31:55.692975+00
msg_1794882724090_4qchq	HEcSi8_wi	Dauss	#3B8282	f	whisper	SUIltQZED	HEHE	SUIltQZED	HEHE	skrrt	1794882724090	2026-11-17 02:32:04.092087+00
msg_1794882880831_3g90q	x6OxYg0ng	Dauss	#3B8282	f	whisper	k2p3jCPzn	HEHE	k2p3jCPzn	HEHE	skrrt	1794882880831	2026-11-17 02:34:40.832829+00
msg_1794885898507_drg9t	ICg97Z8AI	Admin	#3B8282	t	org	1	Weblegh	\N	\N	test	1794885898507	2026-11-17 03:24:58.510597+00
msg_1794885908991_q4qqd	zgLJv9I-h	Dauss	#3B8282	f	org	1	Weblegh	\N	\N	huh	1794885908991	2026-11-17 03:25:08.995267+00
msg_1794886725038_k9nbe	dG04OaKpz	Dauss	#3B8282	f	org	1	Weblegh	\N	\N	ui	1794886725038	2026-11-17 03:38:45.043736+00
msg_1794890348869_yfn7a	Jc1w03A3C	Dauss	#3B8282	f	map	space_central_plaza	Map Chat	\N	\N	djdj	1794890348869	2026-11-17 04:39:08.870886+00
msg_1794890349896_ddmte	Jc1w03A3C	Dauss	#3B8282	f	map	space_central_plaza	Map Chat	\N	\N	dd	1794890349896	2026-11-17 04:39:09.898343+00
msg_1794890350168_zs5z7	Jc1w03A3C	Dauss	#3B8282	f	map	space_central_plaza	Map Chat	\N	\N	d	1794890350168	2026-11-17 04:39:10.170294+00
msg_1794890365309_o1epl	Jc1w03A3C	Dauss	#3B8282	f	map	space_central_plaza	Map Chat	\N	\N	djdjd	1794890365309	2026-11-17 04:39:25.311051+00
msg_1794890366201_gku41	Jc1w03A3C	Dauss	#3B8282	f	map	space_central_plaza	Map Chat	\N	\N	dndndd	1794890366201	2026-11-17 04:39:26.203118+00
msg_1794890379316_ll3br	Lgr-NMv7W	Dauss	#3B8282	f	map	space_central_plaza	Map Chat	\N	\N	assada	1794890379316	2026-11-17 04:39:39.318682+00
msg_1794929112961_3ouad	NJrUTDyOy	melon	#3B8282	f	map	space_central_plaza	Map Chat	\N	\N	bip	1794929112961	2026-11-17 15:25:12.962863+00
msg_1795081394687_02tu5	ByYT8N7Qy	nooogel	#3B8282	f	map	space_central_plaza	Map Chat	\N	\N	ahhhhh	1795081394687	2026-11-19 09:43:14.689231+00
\.


--
-- Data for Name: friendships; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.friendships (id, requester_id, addressee_id, status, created_at, updated_at) FROM stdin;
1	15	11	accepted	2026-11-17 02:31:38.38557+00	2026-11-17 02:31:50.577075+00
2	8	15	accepted	2026-11-17 03:28:06.645228+00	2026-11-17 03:28:14.447809+00
3	15	16	accepted	2026-11-17 15:30:30.833624+00	2026-11-17 15:30:39.660819+00
\.


--
-- Data for Name: notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notes (id, type, title, content, author_id, space_id, organisation_id, created_at, updated_at, images) FROM stdin;
1	personal	Skrrt	<b>Hello World!</b>	15	\N	\N	2026-11-17 04:36:12.639764+00	2026-11-17 04:36:12.639764+00	[]
2	personal	Hello	<div>asdasd</div><div>sacdadcv</div><div>ad</div><div>asd</div><div>as</div><div>das</div><div>da</div><div>wfd</div><div>qef</div><div>qe</div><div>fwe</div><div>te</div><div>rt</div><div>ry</div><div>ry</div><div>ur</div><div>y3</div><div>t</div><div>2r</div><div>qw</div><div>dqw</div><div>eq</div><div>we</div><div>qwe</div><div>qweqwead</div><div>cfsad</div><div>vsf</div><div>vd</div><div>fbadas</div><div>dqw</div><div>q</div><div>we</div><div>qwe</div><div>qwe</div><div>qw</div><div>eq</div><div>we</div><div>qwr</div><div>twr</div><div>terhg</div><div>djdjdj</div><div>djddidj</div><div>dkdjdjjdmdjdjxmc</div><div>c</div><div>cxkdjdorpe</div>	15	\N	\N	2026-11-17 04:42:16.240563+00	2026-11-17 04:42:46.144001+00	[]
3	space	Deez Nutz	Deez Nutz	15	user_space_15	\N	2026-11-17 07:22:37.185822+00	2026-11-17 07:36:37.282145+00	["data:image/jpeg;base64,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ekHxN4a0KwubfwlDP9ou02NPORlFPZcf5+uK8yoAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKchCuGPODmgBtFaM13FJMkipwvXPeke7ia5Wbb8qjpxQBn0Vofa4vtXn7flxjHFVbiRZZmkUYBoA7DQPFOq2tsnh0Xn2O0mkG6bbl4w3XaR0B/ziu9lj+GOlO1rMkmoTL/AKyUbpefUkEL+VeGV6H4Q8dv4Ys7ize3WZXy8ZGAQ/8AtHuv60AdDqOoaN4Yhh1vwVqHEzYazYl0YdyVPzLj3/CvJ769udSvJb68bfLKxZj05NNvLmS9upLuUAPKxdgoCjJOeAOlVaAPYvhiqHW4N3UWcpX6+YAf0qf4xqgutPf+IpID9AVx/WvNtJ1mTTnjkjkeCWAny5Y8EgN1BB4INT6rqg1y4F1ql7LK4GB+6AAHoADgUAcxRWn5Olf8/En/AH7/APr0nk6V/wA95P8Av2P/AIqgDS0xLeW3gS8x5XmybieMDy8/zrnDjPFXrq4idEt7cERR5xu6knqTVCgAooooA//S8OooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9Pw6iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//1PDqKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//V8OooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKK39B8Oal4juTbaeowg3SSOcIg9SaAMCivR3+HkkyOuj6laX08Yy0MbfNx6dc/pXnkkbwyNFKpVlJDA8EEdQaAI6K6W88Pmy8OWmuyzfNeSMqRY/hXOWzn+netSx8A67d6RNrMoW3iijaQLLkM6qMkgAflnFAHDUVatLS5vrlLS1QySyHaqr1JNegj4csjLa3mq2cN23SBn5yegJ65/CgDzSitbWNG1DQr5tP1FNki8jHIYHoQe4rJoAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKK19GGlPeCLVtwicFQynG1j0J9hS6xo9xo9x5UvzRtzHIOjCgDHoorrdK0W2SzOsa5lLYD92g4aQ9se3+elAHJUU9tpY7OBnjPXFMoAKKKKAP//W8OooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAK9V0Xzj8NNS/s3PnfaB52373l4X9MZ/DNeVV2vhiXxNpUFxr2iAPBD8s6kggjr8yZyR7igDJ8MC+PiCy/s7d53nLjb6Z5z7Y6+1dL8TLFLbxZJ5A/4+I0lwP7x4P54q1a+K9V167TSdGsraylu2CSSW8eHKn73PYY5NaesLDr3xOt7GH5o7do42x6RZdh+ByKAKvi+/Gg6po+npGsv9l2yMUf7pkYc5/IGrnhTWdR1yLX7zUpTI5sXx2CjDcKOgFcB4uvzqfiW+u85BlKr/up8o/QV1Xw8/5B+vf9eLfyagBPhvF5MmpawieZLZ2p8pcZO9s4x+WPxqMeAry4lxqWqWkN9KdxhkkzJubn5sdz7Zq/8Kb3yr2/sIziaeDdFnuyZ4/XP4V5hcC5F063Ibzt537s7t2ec++aAOh8VN4iiu49N8RtuktU2xnA5Q9CGA+YcdTzXK16p8QfNGi6Et//AMfot283P3sYXG73zn8c15XQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAV1+j6xbS239ia381s3+rk7xHtz6f56VyFdfo+j20Nt/bet/LbL/AKuPvKe3Hp/npQBfi8NWukSyX+tyK1tEf3SryZSenH+fyrmdY1i51i582X5UXiOMdFFdLF4lttXlk0/W41W1lP7srwYiOBz/AJ/Kub1jR7nR7jypvmRuY5B0YUAY1FFFABRRRQB//9fw6iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAre0HxFqfhy5NzpzDDjEkbDKOPQisGigD0Wb4iXixOulWNrYySDDywph+fQ9v1qX4fk20mqeI5ufsdq7Ann94/Tn1ODXmtTJPMkbRI7Kj/eUEgHHqO9AEZJYlmPJrd0bxBd6HDdwWqRsL2IwvvBOFII4wRzzWBRQBatLu5sblLu0cxyxncrL1Br0AfEi5ZhdT6bZS3aji4aP5sjof8A9RrzWigDT1XVr/Wrx9Q1CTzJX/AAdgB2ArMoooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA19GbSkvBLq24xoCwVRncw6A+xp2saxc6xc+bL8qLxHGOiisaigArrNK1q2ezOj65l7YjMbjloz2x7f56VydFAD22hjs5GeM9cUyiigAooooA//9Dw6iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//0fDqKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//S8OooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9Pw6iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//1PDqKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//V8OooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9bw6iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//1/DqKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//Q8OooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9Hw6iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//0vDqKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//T8OooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9Tw6ivtn7Ja/wDPJP8Avkf4UfZLX/nkn/fI/wAKAPiaivtn7Ja/88k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/88k/75H+FH2S1/wCeSf8AfI/woA+JqK+2fslr/wA8k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/wDPJP8Avkf4UfZLX/nkn/fI/wAKAPiaivtn7Ja/88k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/88k/75H+FH2S1/wCeSf8AfI/woA+JqK+2fslr/wA8k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/wDPJP8Avkf4UfZLX/nkn/fI/wAKAPiaivtn7Ja/88k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/88k/75H+FH2S1/wCeSf8AfI/woA+JqK+2fslr/wA8k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/wDPJP8Avkf4UfZLX/nkn/fI/wAKAPiaivtn7Ja/88k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/88k/75H+FH2S1/wCeSf8AfI/woA+JqK+2fslr/wA8k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/wDPJP8Avkf4UfZLX/nkn/fI/wAKAPiaivtn7Ja/88k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/88k/75H+FH2S1/wCeSf8AfI/woA+JqK+2fslr/wA8k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/wDPJP8Avkf4UfZLX/nkn/fI/wAKAPiaivtn7Ja/88k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/88k/75H+FH2S1/wCeSf8AfI/woA+JqK+2fslr/wA8k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/wDPJP8Avkf4UfZLX/nkn/fI/wAKAPiaivtn7Ja/88k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/88k/75H+FH2S1/wCeSf8AfI/woA+JqK+2fslr/wA8k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/wDPJP8Avkf4UfZLX/nkn/fI/wAKAPiaivtn7Ja/88k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/88k/75H+FH2S1/wCeSf8AfI/woA+JqK+2fslr/wA8k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/wDPJP8Avkf4UfZLX/nkn/fI/wAKAPiaivtn7Ja/88k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/88k/75H+FH2S1/wCeSf8AfI/woA+JqK+2fslr/wA8k/75H+FH2S1/55J/3yP8KAPiaivtn7Ja/wDPJP8Avkf4UC1thyIk/wC+RQB//9X3GiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACkpaSgD/1vcaKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKSlpKAP/X9xooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigApKWkoA/9D3GiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACkpaSgD/0fcaKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKSlpKAP/S9xooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKq3EuwBF6tQArzAHC81H5zVF0pKuxRMJW9amSUHrVOnKcUWCxoUtQRtng1NUEi0UUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFJS0lAH/0/caKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigApKx21J/MZEQHaSOT6Uw6jcf3F/M1XKxXRt0VjC/uj/AApz9aik1C9i5ZY8fjS5WO5vUVz41K7fkBAPof8AGlN/eeqD/gJ/xosK5v0Vzhv789HQf8A/+vTPtmon/lsg/wCAf/XosFzp6SuZe+vogCZQ2f8AYAqtJqF/jPmY+gFNRYzr6zZ/muwPRf61ykmp3Izu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Z9DTqavSnL6UALWLrCudh/hH862qyNRnlhnTYeCOR2PNTLYGUfMtfsw8kESgj6/nXSWzl7dGbkkVnTaXFKN8PyMe3aptPjniDRzdB09PwqY7iRpiniminitCh1FJS0ALTqbThQA6iiigB1FJS0AMNKfumg0fwmkI14/9Wv0FSVHH/q1+gqSsTMKKKKACiiigAooooASuB1yQSai+OigLXYX97HZQGRuWP3R6muBVJLmUs3JY5NaQRcS/YqdoNbkfaq0EOxQKuqKbGTLU8XMi1XFWbcZkz6VJLNCiiioJCiiigAooooAKKKKACiiigAooooAKKKKACkpaSgD/1/caKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDyXx9/yFIP+uX9TXDiu68ff8hK3/wCuR/nXDVqti0aI6CrCVXXtU6VQy9HV1OlUo6vR0wLcfari8iqScVdTpQDJFqwtQgVMtJgWVp3Q0xakbmgB3WsHWOJI/of51uCsTWCPMj+h/nUy2BkP2XUFwWbAP+1Wvp8VxGreec5xjnNYtwzzXrR56dPwFamkuxRlzkCojuJGyKeKYKcK1KH0UUUALTqbS0AOFLSUtAC0UlLQwENB+6adTT0NIRrx/wCrX6CpKqpPGqKCecUhu07AmsrGZboqgbtz91aiM8574osOxp0wyIv3iBWYfNbqSab5JNPlCxfa6hXvn6VVlv2AIhTJ/wBqmeSKdsUdqdh8piyW01zJ5k7bjVmG1SMdOa0ioFR9KYyELin9KDTM0Ax5bFaFqmI956tzWfAhnk29h1rZAwMCpZLHUUUVIgooooAKKKKACiiigAooooAKKKKACiiigApKWkoA/9D3GiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA8m8f/APISt/8Arl/7NXELXb+P/wDkJW//AFyP/oVcQO1ax2LRoirCVEO1TJVDLiVdjqklXY6YFtatxmqqDNWY6QFtRUqiolqYUASrUwGaiWpVoATpWRqtvJKFkjGduQcVt7c1VmuY7dlVwSW6YGaTQGFaQXEsxmkU4AOSRjPGK09JjdN+9SOnWtFpI05dgKYt1EzhEOSfQVCVgLmKWmg0+tBiiloooAWilpaACloooAWiiloABS4zSU4GkIcqDFO2ClDcUm4VIChQKXio99N30ATUmQKgMlMMnvQBZ3UheqZl96YZgO9AFsvUbPVNrgetV5LpF6mgReZ6iDNK4iiGWNVoFub5sQD5e7noP8a6S0s47VMLyx6seppNibJLeEQRhBye59TViiioJCiiigAooooAKKKKACiiigAooooAKKKKACiiigApKWkoA//R9xooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPJ/iB/yEbf8A65H/ANCrh17V3PxB/wCP62/65n+dcMvato7Fo0x2qZKiHapUpgXEq/HVCOr8dMZdSplqFKnWkBbSpxVZKsrQBItTCoBxUymgCYVzGrkpd5/vKK6YViaqrTzxxAEqASxAPFTLYGYyyZxvzke/atzTZInYgA7vzqjHZYsjNIrGTPA/+tV2wgeC5xtO0r1x074rNIRtipFplPFbFElFNFPBoAWloFLQISloooAKKKWgBDTd2M07rUT8A0gHeZxTTJWG+oRqPvdKrf2i0h2xKzH/AGQTSA6AzY71E1wPWslIdYuP9XAwB7vx/OrK6Dqsv+ulRPpk0riJWu0HU1VfUYlz81aMfheHrcTu59sCtCLQdKix+5DEd2yf50riuck2qqThAWPtzT0OqXP+pt3IPcjA/Wu9jghiGIkVR7ACpqXMFzh49G1mc/vWSIfXJ/Stm18P20JD3DGZh/e4H5V0FFK4rjFVUUKowB2FPoopCCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKSlpKAP/0vcaKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDyr4g/8ftr/ANcz/OuDFd/8QUb7TavjjYw/WvP62jsWjUXoKsJVRD8oqzGaYy9HV+Os+OryUwLqVZSqqdqspSAsLxVlDVdamXigCenqaYtPFAEqmphUIp4oAcRjmm1IOaTbSAKcKbTxTGKKWiigB4p3FRinigTHGgUlLjNABSUvSkoAKRulKKRiADUgyS30rT0USeSpJ5+bn+daaRogwigD2GKSIYjUewqSs2Zi0UUUgCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACkpaSgD/9P3GiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA5TxdpT6npZaEZlgO9R6juPyrxUNX0pXinjDRf7M1D7VCMQXBLD/ZbuP6i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FYmYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABSUtJQB//S9xooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigClqCeZYzx/3o2H6V86r0FfSbruQr6givnBxskZP7rEfka0gUi3Byhq0tVLc/KatJVlFyOr0ZqhHV9KYy5F3q8hqhF1NXkoGWkqZagWrC0hEy1KtRrUi0ASU4U2nCgB9FFFAEi9BT6jXpT6AHrSmmDrT2oAbRRRQMUUq8yKPVh/Okp8QzOg/2qTJZt0UUViZhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFJS0lAH//0/caKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooASvnXUE8rUbiP+7K4/WvoqvA/EUfla9dr6yFvz5q4FRKFv3q4tU4PvGri1oUW46vx1nx1oR0xluL71XkqhH94VfSgotJVharpU60iSdalWolqVaAJKcKbThQA8UUUUAPTpT6YnSn0ALT+oplPHSgBtFFFAwqW35uE9s/yqKprTm4HsDUslmzRRRWRmFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUlLSUAf/U9xooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigBK8O8Xps8Qz/wC1tP6V7jXjXjlNuu7v70S/4VUdyonLQffq8tUIfviry1qUW46vx1nR9q0I6Yy4nUVoJWctaCdKCi0lWFqulWFpEky1MKhWpVoAlpwptOFADxRRRQCHLUgqNOlSUAOFOHQ00U4d6AG0UUUAFWLLmc+y/wBar1bsR+8Y+1TLYTNSiiisjMKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigApKWkoA//9X3GiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAEryb4gR41G3k9YiPyNes15l8Qk+e0f2cfyqo7jR55H98VfWs9OHFaArUsspV+LtWelX4u1Ay6tXozlRVBe1XYulMoupVharpVhaRJOtTCoFqYUASinCmCnUASCigUUAOXvUgqNe9SCgBaeKaKetADaSlPWkoAKu2HVz9KpVesOj/AFH8qmRMjRooorIgKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigApKWkoA//W9xooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigBK86+IS/wCj2j+jsP0r0WuC+IC502B/SX+YNOO40eVrwRWhWeO1aArYssJ2q9H2qknar0YoGXF7VchqmvQVci6mmUXUq0tVUqytIRMO1TColqSgRKKdTRTxQA8UUUUAPWnimLUgoAWniminigBppKeaSgBlaFgPkc+rf0qjWhY/6o/7xqJEyLtFFFZkBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFJS0lAH//1/caKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAK5Lxnavc6FIYxkxMH49B1/SutqN0WRDG4yrDBHsaEB84LWkOcV0Wu+ELqzdrnTh5kPXaPvL/iK5aNiPkcbWFbJ3NDRTtV6OsxHAPWr8cg9aY0aKdKtRjmqaOCKtxtyKCkXlqwtVkNWVNAidamWoVNTLQIkFPFMFOoAkopBS0APFSCo161IKAY8UtNBp2aBAaKYXA71H5wztXknsKQyRjitS1UrCM9Tz+dVYLVmIebgf3f8a06zkyGxaKKKkkKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigApKWkoA/9D3GiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigBKyL7Q9L1HJuYQWP8S8N+YrYooA88uvAiHLWNwV9nGf1FYc3hTX7bJjCyj/AGT/AENev0lVzMdzxN7TWrb/AFtrL+RP8qhXUniOJUZSPUEV7lUbRRv99QfqM0+cpSPIY9Yt+PmxWjHqls38Qr0GTStMm/1ttE31QVVbw7ob9bSP8Bj+VPnHznKJfQn+IVYW8iPcVuHwtoJ/5dwPoWH9aT/hFdE7REfR2/xo5xcxlrdR+op4uY/WtD/hFdFH/LNv++2/xqQe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28zrchi3mZyST1znrms6igDtb/x74l1GD7PNOqK2N3loqlsepHb26Vzurave63fNqGoMHlYAEgAcKMDgVmUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAf/V8OooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9bw6iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//1/DqKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//Q8OooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9Hw6iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//0vDqKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//T8OooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9Tw6iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//1fDqKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//W8OooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9fw6iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//0PDqKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//R8OooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9Lw6iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//0/DqKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//U8OooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9Xw6iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//1vDqKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//Z"]
\.


--
-- Data for Name: organisation_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.organisation_members (id, organisation_id, user_id, role, joined_at) FROM stdin;
1	1	8	leader	2026-11-17 03:24:34.216357+00
2	1	15	member	2026-11-17 03:24:34.216357+00
3	1	11	member	2026-11-17 03:24:34.216357+00
\.


--
-- Data for Name: organisations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.organisations (id, name, logo, creator_id, created_at, updated_at) FROM stdin;
1	Weblegh	data:image/png;base64,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	8	2026-11-17 03:24:34.216357+00	2026-11-17 03:24:34.216357+00
\.


--
-- Data for Name: players; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.players (id, name, color, x, y, created_at, last_seen) FROM stdin;
86Xjy8icO	HEHE	#06b6d4	960	540	2026-10-16 07:41:17.289108+00	2026-10-16 07:41:17.289108+00
wIhjS9xZK	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:27:45.185291+00	2026-10-19 03:27:45.185291+00
7k7m-4tBE	Har	#ec4899	1275	975	2026-10-16 09:54:08.110977+00	2026-10-16 09:54:09.704384+00
eNHKiXc5q	TestUser	#3b82f6	308.63210355196986	201.7102529004246	2026-10-16 03:36:19.662286+00	2026-10-16 03:36:34.516435+00
ewF6HuAKZ	TestHero	#ef4444	994.8308310672	813.7791949583998	2026-10-16 08:10:32.667688+00	2026-10-16 08:10:57.611877+00
ihZg-gr4R	PlayerOne	#10b981	408.0312000985645	260.48482111633854	2026-10-16 03:41:19.563021+00	2026-10-16 03:41:19.566505+00
LcbuQlOEi	Debugger	#3b82f6	960	540	2026-10-16 06:31:03.935826+00	2026-10-16 06:31:05.939041+00
vqmkTGM9f	DebugTester	#3b82f6	960	540	2026-10-16 03:59:43.81767+00	2026-10-16 03:59:48.82239+00
pUV9s2eS0	Probe	#ef4444	1365.8400000000004	540	2026-10-16 06:42:02.722761+00	2026-10-16 06:42:04.726217+00
5ACm4f2Zg	UwU	#3b82f6	426.2538689427738	204.11317160766677	2026-10-16 03:42:04.982471+00	2026-10-16 03:42:10.689189+00
fbtftWEM7	Probe	#ef4444	1366.0800000000004	540	2026-10-16 06:47:04.137303+00	2026-10-16 06:47:06.132913+00
5CgimgcyY	🍰	#10b981	960	540	2026-10-16 07:34:42.649395+00	2026-10-16 07:34:54.640526+00
Inj8QjT_H	CosmicDot	#3b82f6	960	540	2026-10-16 06:14:26.741891+00	2026-10-16 06:21:33.806465+00
j09gARt9d	CosmicDot	#ec4899	478.753239102793	205.41084309656972	2026-10-16 03:50:12.918265+00	2026-10-16 03:51:29.605445+00
tE-PPZbaR	HEHE	#06b6d4	1835.7121369343963	914.4681475951998	2026-10-16 07:41:37.37531+00	2026-10-16 07:41:56.171931+00
xNILAg9-i	TestPilot	#3b82f6	960	540	2026-10-16 03:59:12.341861+00	2026-10-16 04:00:20.502644+00
HuckXZwt6	SmoothGlide	#ef4444	37.5	384.50979822973403	2026-10-16 09:38:49.773466+00	2026-10-16 09:42:00.259208+00
SVZ1tedd2	Probe	#ef4444	1366.5600000000004	540	2026-10-16 06:47:17.722252+00	2026-10-16 06:47:19.718172+00
QHeU3jsSU	Debugger	#3b82f6	960	540	2026-10-16 06:31:14.013006+00	2026-10-16 06:31:24.205058+00
SB_6nSVLM	Sparky	#8b5cf6	488.46731836902956	342.4328014879853	2026-10-16 03:42:51.677328+00	2026-10-16 03:43:45.589554+00
_y8JZXbp2	TesterDot	#8b5cf6	363.63731977329024	290.38367733966925	2026-10-16 03:46:32.584857+00	2026-10-16 03:46:32.586597+00
5kapVHDIi	TestPlayer	#3b82f6	960	540	2026-10-16 06:21:49.848564+00	2026-10-16 06:21:51.851403+00
8H5yH5dIz	WoodWalker	#ef4444	1275	975	2026-10-16 09:23:17.391152+00	2026-10-16 09:25:20.526954+00
rkl-VoBXC	Server Admin	#3b82f6	1026.8175571330219	872.8298616068043	2026-10-17 12:04:49.389294+00	2026-10-17 12:05:03.646764+00
b_mVgD4_y	HEHE	#06b6d4	860.1046926143995	615.9030825312002	2026-10-16 07:42:32.2928+00	2026-10-16 07:42:54.17905+00
nklE1vIr2	HEHE	#06b6d4	2325	975	2026-10-16 09:25:25.133192+00	2026-10-16 09:29:39.520159+00
R2Vh0787d	TestBot	#ef4444	960	540	2026-10-16 06:50:28.99122+00	2026-10-16 07:02:31.02446+00
ELApkAhkU	PlayerTest	#3b82f6	960	540	2026-10-16 06:32:07.179311+00	2026-10-16 06:32:08.181675+00
_F2I0zgYY	Server Admin	#3b82f6	1250	950	2026-10-17 12:18:10.288952+00	2026-10-17 12:18:39.883081+00
cU_YE3zJz	TestBot	#ef4444	960	540	2026-10-16 06:58:08.069022+00	2026-10-16 07:13:18.080258+00
26IaPpbcn	TestBot	#ef4444	960	540	2026-10-16 06:39:17.00885+00	2026-10-16 06:48:18.891857+00
XO7g6PrBL	SmoothGlide	#ef4444	1142.2322022294256	1069.383898885287	2026-10-16 09:39:28.029992+00	2026-10-16 09:39:31.629283+00
4xkAOwJ6g	Probe	#ef4444	1364.8800000000003	540	2026-10-16 06:48:36.33708+00	2026-10-16 06:48:38.345469+00
yRdf87vj6	DAUSH	#ef4444	1425	1125	2026-10-16 09:25:25.995059+00	2026-10-16 09:25:36.740738+00
QiTSrUpyv	TestHero	#ef4444	1072.1408050415994	449.9404927343998	2026-10-16 08:20:40.770702+00	2026-10-16 08:25:28.651952+00
DLi64-tIR	Har	#ec4899	1068.4808791674186	719.4295251383803	2026-10-16 09:44:23.996354+00	2026-10-16 09:45:45.598486+00
e4XQpBNkT	NpmTester	#f97316	960	540	2026-10-16 07:21:11.507446+00	2026-10-16 07:21:36.948543+00
11soopUff	HEHE	#06b6d4	1575	1125	2026-10-16 09:12:01.803711+00	2026-10-16 09:18:16.169608+00
32fxWPEmi	Har	#ec4899	1275	975	2026-10-16 10:12:50.627392+00	2026-10-16 10:13:08.462512+00
ynfFiFwfL	Teter	#3b82f6	960	540	2026-10-16 04:01:09.708919+00	2026-10-16 04:03:14.134141+00
MGkcdym6l	HEHE	#06b6d4	1153.4745859245481	902.0655353927006	2026-10-16 10:12:43.051173+00	2026-10-16 10:13:08.462512+00
STORFGfxo	UwU	#3b82f6	435.18097036313213	324.06554996206944	2026-10-16 03:49:29.116648+00	2026-10-16 03:49:35.244777+00
gdMDwS0uy	TestBot	#3b82f6	960	540	2026-10-16 06:35:05.358425+00	2026-10-16 06:38:36.46659+00
_UK54r3Cm	CosmicDot	#10b981	368.14768295322204	363.42988661155897	2026-10-16 03:47:48.049781+00	2026-10-16 03:49:37.974215+00
HUt0bWlIX	TestHero	#ef4444	931.50943728	557.2105627200002	2026-10-16 08:41:44.91717+00	2026-10-16 08:54:36.070192+00
CIchw1D0I	Har	#ec4899	1275	975	2026-10-16 10:17:36.002708+00	2026-10-16 10:17:37.165982+00
nciKBNp48	Debugger	#3b82f6	960	540	2026-10-16 06:29:15.916758+00	2026-10-16 06:29:17.920828+00
pnVxN1zl0	CosmicDot	#10b981	494.7430371817623	206.22532298384812	2026-10-16 03:49:39.635809+00	2026-10-16 03:50:10.226407+00
T0j6sjM6J	CeCenterDotCosmicDot	#3b82f6	960	540	2026-10-16 03:53:27.13182+00	2026-10-16 03:56:30.783059+00
EmaFbKZDt	HEHE	#06b6d4	1298.756969519997	887.7484252015985	2026-10-16 08:07:31.384732+00	2026-10-16 08:17:52.905477+00
-cCjH7EJu	Probe	#ef4444	1255.9200000000003	540	2026-10-16 06:51:41.045144+00	2026-10-16 06:51:42.549535+00
lwv3VI30e	UR MUM	#10b981	960	540	2026-10-16 08:17:41.719454+00	2026-10-16 08:17:56.211307+00
nqXZvTJ6o	CosmicDot	#3b82f6	960	540	2026-10-16 06:21:35.127482+00	2026-10-16 06:34:12.614087+00
aESvFNInJ	TestPilot	#3b82f6	960	540	2026-10-16 03:58:49.040052+00	2026-10-16 03:59:05.627613+00
lQm3042Lw	Probe	#ef4444	1366.5600000000004	540	2026-10-16 06:45:09.450343+00	2026-10-16 06:45:11.44769+00
h4BuFT1Ck	MiniHero	#ef4444	1425	1275	2026-10-16 09:19:31.664766+00	2026-10-16 09:20:07.959375+00
4bLo5Qn3O	Server Admin	#3b82f6	1250	950	2026-10-17 12:18:40.102071+00	2026-10-17 12:19:09.447405+00
P-5GspSiE	Debugger	#3b82f6	960	540	2026-10-16 06:29:46.791344+00	2026-10-16 06:29:48.793614+00
zM7gNJl3M	GlideHeroJitterTest	#ef4444	1288.72	975	2026-10-16 09:33:02.408116+00	2026-10-16 09:34:08.644606+00
wIREAX8lB	TestBot	#3b82f6	960	540	2026-10-16 06:34:31.198027+00	2026-10-16 06:34:52.755403+00
f0siAZpJK	EHE	#ef4444	960	540	2026-10-16 07:46:54.895413+00	2026-10-16 07:48:58.331812+00
c-iWB9kVC	MiniHero	#ef4444	1275	825	2026-10-16 09:08:24.66663+00	2026-10-16 09:10:47.231779+00
JwIV_M3mv	HEHE	#06b6d4	92.1353073856	355.09599331039897	2026-10-16 07:57:16.74265+00	2026-10-16 07:58:32.711671+00
RAi_4QCaw	Probe	#ef4444	1365.8400000000004	540	2026-10-16 06:45:46.257597+00	2026-10-16 06:45:48.256271+00
rXat8hrSC	Probe	#ef4444	1316.6400000000003	540	2026-10-16 06:40:47.875867+00	2026-10-16 06:40:49.881059+00
EjJo2dQkF	TileAdventurer	#ef4444	1275	675	2026-10-16 09:03:37.097316+00	2026-10-16 09:04:42.301854+00
XCAWQEjbT	Server Admin	#3B8282	1250	950	2026-10-17 12:19:09.634781+00	2026-10-17 12:19:29.317385+00
w5WaoLEb8	Har	#ec4899	1142.7505758742977	1305.6182320230525	2026-10-16 09:50:51.624215+00	2026-10-16 09:51:31.366154+00
krSqryLK1	HEHE	#06b6d4	1154.64	552.24	2026-10-16 08:18:11.320199+00	2026-10-16 08:19:07.002119+00
4wwb8FoFx	EHE	#ef4444	960	540	2026-10-16 07:51:56.742955+00	2026-10-16 07:52:45.577581+00
5s5O4bA8r	SmoothGlide	#7c5a5a	915.8870505828648	1006.2528484044567	2026-10-16 09:41:59.365182+00	2026-10-16 09:43:00.665978+00
MhLWjxf-y	Server Admin	#3b82f6	913.9796395319676	1364.8676118445742	2026-10-17 12:05:03.751726+00	2026-10-17 12:06:20.262778+00
HbF0608tq	EHE	#ef4444	574.7705280191999	413.5914452543998	2026-10-16 07:22:45.425675+00	2026-10-16 07:26:15.527075+00
i7KtGpEz0	EHE	#ef4444	1222.3085801871998	931.5358440800001	2026-10-16 07:54:48.377556+00	2026-10-16 08:04:52.72292+00
GgBSDcKLq	HEHE	#06b6d4	1181.6001839312007	952.9178347040009	2026-10-16 07:58:58.450112+00	2026-10-16 08:04:52.786243+00
jWqZoQofA	gg	#3b82f6	1275	975	2026-10-16 09:48:11.496384+00	2026-10-16 09:48:33.688922+00
V2K5dfqsT	UR MUM	#10b981	1002.5851171151992	451.08539355360006	2026-10-16 07:31:29.596019+00	2026-10-16 07:40:27.877706+00
3vayON3Ku	Bij	#ef4444	951.812682888	638.8729269615995	2026-10-16 07:24:01.675895+00	2026-10-16 07:40:27.877601+00
q1llSTK5K	HEHE	#06b6d4	989.5893146592001	449.5377294336018	2026-10-16 07:24:08.87194+00	2026-10-16 07:40:27.877806+00
o4uzQi81I	HEHE	#06b6d4	1142.3282830395679	692.4671719001144	2026-10-16 10:25:15.220401+00	2026-10-16 10:25:31.065186+00
F_zEU_Gwl	NortiAI	#3b82f6	829.8625253169416	980.723393821899	2026-10-16 09:50:34.838269+00	2026-10-16 09:51:58.680232+00
T4NlxIXXM	SmoothGlide	#ef4444	1275	975	2026-10-16 09:37:14.736366+00	2026-10-16 09:38:46.090037+00
rEHKjkEeP	HEHE	#06b6d4	1157.5211512384194	653.8210299211722	2026-10-16 09:41:29.239374+00	2026-10-16 09:43:54.479964+00
gVTXL0sQX	TestHero	#ef4444	994.9550737391991	743.0987195743984	2026-10-16 08:06:51.221732+00	2026-10-16 08:10:24.266297+00
_GWRzRL7R	TileAdventurer	#ef4444	1125	975	2026-10-16 09:04:49.766146+00	2026-10-16 09:05:47.104699+00
21oQgW2s5	TileAdventurer	#ef4444	1275	975	2026-10-16 09:03:15.599786+00	2026-10-16 09:05:47.105985+00
CGtAkvHKz	Har	#ec4899	638.5843841542812	1059.7937169094143	2026-10-16 09:46:17.380888+00	2026-10-16 09:49:34.286968+00
IWvqbsrJn	HEHE	#06b6d4	1042.891070785401	671.7710707854013	2026-10-16 10:25:36.061272+00	2026-10-16 10:26:29.600417+00
jUZIhU4iW	HEHE	#06b6d4	1275	975	2026-10-16 10:26:29.989262+00	2026-10-16 10:26:42.424569+00
smh1RD-UZ	SmoothGlide	#7c5a5a	763.7340905032662	609.5755864092167	2026-10-16 09:39:38.802918+00	2026-10-16 09:41:57.158181+00
Xue-oRouX	HEHE	#06b6d4	1275	975	2026-10-16 09:53:36.522966+00	2026-10-16 09:53:55.655222+00
8dmHEAq22	firdausfadzi	#3B8282	1225	915	2026-10-19 03:50:29.819194+00	2026-10-19 03:50:38.318074+00
jSwZAMsr2	Server Admin	#7c5a5a	1250	950	2026-10-17 13:13:47.228519+00	2026-10-17 13:13:48.364936+00
syJBbRsbN	Server Admin	#3B8282	1250	950	2026-10-17 13:13:48.271945+00	2026-10-17 13:13:48.364897+00
iEAjmCYtt	Server Admin	#3B8282	1225	925	2026-10-17 13:43:15.258918+00	2026-10-17 13:43:16.711276+00
WyrWrSClw	TestHero	#ef4444	1086.661558032	419.36841594239996	2026-10-16 08:27:05.618169+00	2026-10-16 08:35:07.664778+00
eXs9zDagZ	HEHE	#06b6d4	1175.5451252063986	436.61208721920013	2026-10-16 08:20:09.331263+00	2026-10-16 08:35:07.715419+00
r72asK_ZT	Server Admin	#7c5a5a	1225	925	2026-10-17 13:43:14.223965+00	2026-10-17 13:43:16.711273+00
Hh_XeV5mS	Pro Gamer	#7c5a5a	1250	950	2026-10-17 12:13:49.571545+00	2026-10-17 12:14:07.697752+00
AkXHhdM8m	Haikal	#3b82f6	1278.025545544985	628.856717343065	2026-10-16 10:10:38.856937+00	2026-10-16 10:12:08.467181+00
VSVgqhh0b	Server Admin	#3b82f6	1250	950	2026-10-17 12:06:28.58862+00	2026-10-17 12:18:10.091871+00
MaRTRj5xI	HEHE	#06b6d4	927.2109872208003	541.1708831184002	2026-10-16 08:46:16.855125+00	2026-10-16 08:57:46.677314+00
SMtum-syV	JitterTest	#ef4444	1275	975	2026-10-16 09:27:07.872068+00	2026-10-16 09:29:42.501198+00
safb6Pweq	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:28:20.392142+00	2026-10-19 03:28:25.450074+00
IkcF2pSv0	HEHE	#06b6d4	1425	1275	2026-10-16 09:11:42.867182+00	2026-10-16 09:11:59.667699+00
AnkVtSygW	Server Admin	#3B8282	1225	925	2026-10-17 13:53:40.011123+00	2026-10-17 13:53:50.373146+00
yVUcANRd8	Server Admin	#3B8282	1250	950	2026-10-17 12:19:29.472086+00	2026-10-17 12:19:36.500183+00
juCFfLnU4	HEHE	#06b6d4	1199.3739788281266	719.9648897278463	2026-10-16 10:09:41.510104+00	2026-10-16 10:12:32.202222+00
Jz6Vbq7ks	Server Admin	#7c5a5a	1250	950	2026-10-17 13:41:14.30022+00	2026-10-17 13:41:27.160832+00
xqJ6BQrfI	MiniHero	#ef4444	1575	825	2026-10-16 09:11:19.810793+00	2026-10-16 09:18:15.789777+00
TZGFjXhOX	Har	#ec4899	1275	975	2026-10-16 10:14:09.824354+00	2026-10-16 10:14:11.482444+00
LP1ikXfgL	Server Admin	#7c5a5a	1250	950	2026-10-17 13:02:09.735165+00	2026-10-17 13:03:00.306346+00
MiCPs2zLE	Server Admin	#3B8282	1250	950	2026-10-17 13:02:10.822482+00	2026-10-17 13:03:01.252956+00
OCcxxqR1w	Server Admin	#3B8282	1250	950	2026-10-17 13:41:15.262579+00	2026-10-17 13:41:27.160845+00
HiNRBNH0X	Server Admin	#3B8282	1225	915	2026-10-19 07:36:40.814755+00	2026-10-19 07:36:40.814755+00
evWjMw4ms	Pro Gamer	#7c5a5a	1225	915	2026-10-19 02:51:18.98257+00	2026-10-19 02:51:39.042954+00
yAwpaBgYJ	Pro Gamer	#7c5a5a	1225	915	2026-10-19 02:51:39.110627+00	2026-10-19 02:51:44.191648+00
YOdBXhxpx	HEHE	#06b6d4	375	825	2026-10-16 09:21:52.084436+00	2026-10-16 09:22:32.756637+00
JUSBxsJJN	GlideHeroJitterTest	#ef4444	1275	975	2026-10-16 09:34:44.314974+00	2026-10-16 09:35:46.241447+00
IL2sHTneF	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:32:40.545037+00	2026-10-19 03:32:58.227022+00
WQZaBT-TG	Server Admin	#3B8282	1225	915	2026-10-19 04:20:38.964601+00	2026-10-19 04:20:53.926452+00
Oc40TQbCq	George	#3b82f6	1275	975	2026-10-16 09:43:46.351323+00	2026-10-16 09:44:04.946683+00
i_HXkHugh	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:28:31.665809+00	2026-10-19 03:28:54.010137+00
5dtUwBS8l	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:36:05.931178+00	2026-10-19 03:36:07.224753+00
n5S4MZREe	UWUUWU	#7c5a5a	1184.9055252404153	984.5855252404149	2026-10-16 09:56:52.328161+00	2026-10-16 09:58:49.994159+00
CkKTbajYW	Harith	#ec4899	1165.3384949621206	927.6974848353441	2026-10-16 10:27:40.088935+00	2026-10-16 10:28:41.686318+00
VOYSkEMDa	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:28:54.077204+00	2026-10-19 03:29:00.863731+00
jid7y-8id	Anon	#3b82f6	1275	975	2026-10-16 10:27:38.059645+00	2026-10-16 10:28:42.464742+00
kfErXrpU_	Server Admin	#7c5a5a	1149.818820407332	1010.1411795926682	2026-10-17 12:25:37.466041+00	2026-10-17 12:33:40.897941+00
7SotAkxMI	UWUUWU	#7c5a5a	1145.3659485753396	360.7849491110278	2026-10-16 09:58:53.278607+00	2026-10-16 10:04:29.468243+00
tnX54NjFB	Daus	#7c5a5a	1105.9558681223282	1405.2604756268847	2026-10-16 09:43:04.426619+00	2026-10-16 09:52:39.693826+00
UqXOSwYn7	Server Admin	#7c5a5a	1225	925	2026-10-17 13:48:03.018307+00	2026-10-17 13:50:17.863059+00
9AEUoSaTF	asdf	#3b82f6	1363.95923250772	1053.28002030457	2026-10-16 09:48:15.97391+00	2026-10-16 09:49:02.269942+00
BXnZJ1FrM	Server Admin	#7c5a5a	1250	950	2026-10-17 13:03:00.35223+00	2026-10-17 13:03:33.694072+00
0pcuXtgrz	Server Admin	#3B8282	1250	950	2026-10-17 13:03:01.447068+00	2026-10-17 13:03:33.956961+00
srwdZlm1m	Server Admin	#7c5a5a	1110.354637917655	850.5343546740161	2026-10-17 12:43:44.18345+00	2026-10-17 12:57:49.610175+00
25AxJdPgd	Server Admin	#3B8282	1250	950	2026-10-17 12:43:45.136755+00	2026-10-17 12:57:50.557743+00
37_vpchXV	hero_player	#7c5a5a	1252.826545519477	855.2723230364977	2026-10-16 10:19:37.766069+00	2026-10-16 10:21:28.282247+00
3PgYDaNFR	Pro Gamer	#7c5a5a	1225	915	2026-10-19 02:47:05.363597+00	2026-10-19 02:48:26.595961+00
26jqa-7n_	Pro Gamer	#7c5a5a	1145.44	915	2026-10-19 03:38:17.601065+00	2026-10-19 03:38:23.872991+00
_6ZIY1nCD	Server Admin	#7c5a5a	1250	950	2026-10-17 13:06:00.975581+00	2026-10-17 13:08:16.930389+00
9SpKoya7s	Server Admin	#7c5a5a	1250	950	2026-10-17 12:57:49.75543+00	2026-10-17 12:58:00.954842+00
pJIIb0Qmn	Server Admin	#3B8282	1250	950	2026-10-17 12:57:50.735147+00	2026-10-17 12:58:00.954837+00
Zoezrw0uC	Server Admin	#3B8282	1145.18	925	2026-10-17 13:53:50.38385+00	2026-10-17 15:07:19.048897+00
5dSTvDCuj	fasdklja	#f97316	1581.5734443282377	774.360636532922	2026-10-16 09:43:22.966315+00	2026-10-16 09:46:39.591705+00
a2ubQhWBl	Server Admin	#7c5a5a	1250	950	2026-10-17 13:08:17.051519+00	2026-10-17 13:08:19.443275+00
EMFttOim1	Pro Gamer	#7c5a5a	1225	915	2026-10-19 02:27:57.44952+00	2026-10-19 02:28:05.73661+00
NpRXxsqpf	Server Admin	#7c5a5a	1225	915	2026-10-19 03:47:03.318965+00	2026-10-19 03:47:28.747035+00
X2IBSpyfE	firdausfadzi	#3B8282	1225	915	2026-10-19 03:47:03.341526+00	2026-10-19 03:47:28.747029+00
XFMtR3mzP	Harith	#ec4899	1275	975	2026-10-16 10:28:41.959839+00	2026-10-16 10:29:41.691676+00
YFc-DKqxh	Server Admin	#7c5a5a	1250	950	2026-10-17 13:00:11.169168+00	2026-10-17 13:00:33.701096+00
kefbdnP4p	Server Admin	#7c5a5a	1225	915	2026-10-19 03:55:52.976633+00	2026-10-19 03:56:41.693463+00
z9Lb8YIYa	Har	#ec4899	1275	975	2026-10-16 09:59:34.479707+00	2026-10-16 10:00:35.015257+00
i6rJscxBG	Server Admin	#3B8282	1250	950	2026-10-17 13:00:12.20726+00	2026-10-17 13:00:34.64138+00
VGqcRJ-TK	Pro Gamer	#7c5a5a	864	721.8199999999999	2026-10-19 03:17:39.717333+00	2026-10-19 03:19:40.710959+00
FLJ7hX62F	Server Admin	#7c5a5a	1250	950	2026-10-17 13:03:33.750018+00	2026-10-17 13:04:23.295652+00
kEFQaGpfS	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:29:18.884476+00	2026-10-19 03:30:38.990327+00
an8TwXzQO	Server Admin	#3B8282	1250	950	2026-10-17 13:03:34.164377+00	2026-10-17 13:04:24.311122+00
IArwRZfbq	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:19:40.90874+00	2026-10-19 03:19:48.592981+00
VYjls2-iR	firdausfadzi	#3B8282	1225	915	2026-10-19 03:53:06.855728+00	2026-10-19 03:53:13.163044+00
o4ke4k9W_	Pro Gamer	#7c5a5a	1080.2888493774208	783.5488493774204	2026-10-19 03:21:30.999249+00	2026-10-19 03:21:36.103196+00
2wFcgxp3b	UWUUWU	#7c5a5a	1273.267545493968	867.5085556207451	2026-10-16 10:05:29.589453+00	2026-10-16 10:11:23.40411+00
C8-UeQ4Lk	UWU	#7c5a5a	1221.1008492207377	1043.831100221902	2026-10-16 10:21:46.923327+00	2026-10-16 10:30:32.80169+00
eOrFl0ry_	Harith	#ec4899	1211.76704043058	966.2729595694202	2026-10-16 10:29:42.066398+00	2026-10-16 10:30:41.748054+00
fc5fVxqYw	Harith	#ec4899	1275	975	2026-10-16 10:30:42.04313+00	2026-10-16 10:30:42.04313+00
Il2IYKIEh	Server Admin	#7c5a5a	1225	915	2026-10-19 03:49:00.884555+00	2026-10-19 03:50:29.638183+00
wnLyr218d	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:30:39.059643+00	2026-10-19 03:31:30.547874+00
hBQhItXYo	Server Admin	#7c5a5a	1368.9121628519629	880.5527808221714	2026-10-17 12:33:51.483258+00	2026-10-17 12:43:44.033271+00
tAQ3zOIXd	Server Admin	#3B8282	1250	950	2026-10-17 12:19:36.640838+00	2026-10-17 12:43:44.981771+00
QlLvnNCXV	Har	#ec4899	1144.0510809376863	753.8598685304663	2026-10-16 10:07:30.358934+00	2026-10-16 10:11:51.907271+00
C5GgGyVTj	Server Admin	#7c5a5a	1250	950	2026-10-17 13:08:19.479495+00	2026-10-17 13:11:41.145631+00
8ML7F52Rg	Server Admin	#7c5a5a	1250	950	2026-10-17 13:00:33.753102+00	2026-10-17 13:02:09.677633+00
f1r0gyN96	Server Admin	#3B8282	1250	950	2026-10-17 13:00:34.805032+00	2026-10-17 13:02:10.623405+00
haeJQlHpD	Server Admin	#3B8282	1186.1129755193501	1000.1116269709671	2026-10-17 13:49:35.015994+00	2026-10-17 13:52:44.667102+00
n-xg5pmv3	Server Admin	#7c5a5a	1225	925	2026-10-17 13:50:17.917242+00	2026-10-17 13:52:52.177727+00
sUMjtD09p	Server Admin	#3B8282	1195.7064322519068	881.9264322519067	2026-10-17 13:53:34.985324+00	2026-10-17 13:53:40.000474+00
0Z_hsHsAp	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:32:58.30619+00	2026-10-19 03:32:58.30619+00
Tbz8nF5qJ	Server Admin	#7c5a5a	1225	915	2026-10-19 03:50:29.818817+00	2026-10-19 03:50:38.314777+00
5qmYgh2b6	nooogel	#3B8282	1225	915	2026-10-19 07:36:40.964017+00	2026-10-19 07:36:40.964017+00
HOR9XZA5A	HEHE	#3B8282	1225	915	2026-10-19 06:54:40.980164+00	2026-10-19 06:54:45.960678+00
aFkGvpN_G	Server Admin	#3B8282	1225	915	2026-10-19 04:21:32.005041+00	2026-10-19 04:21:42.038858+00
FnInpjEDX	Server Admin	#3B8282	1250	950	2026-10-17 13:04:24.574347+00	2026-10-17 13:05:42.243106+00
2Akg2lyBP	firdausfadzi	#3B8282	1225	915	2026-10-19 03:55:38.946865+00	2026-10-19 03:55:52.81737+00
tceeC1OV1	Server Admin	#7c5a5a	1250	950	2026-10-17 13:11:41.199334+00	2026-10-17 13:11:56.097258+00
0FWOzIcYl	Server Admin	#7c5a5a	1225	915	2026-10-19 03:55:39.029341+00	2026-10-19 03:55:52.817373+00
9vitMLoUx	firdausfadzi	#3B8282	1172.48	915	2026-10-19 04:11:28.284005+00	2026-10-19 04:12:12.943594+00
jQK3rSgj2	HEHE	#3B8282	1225	915	2026-10-19 04:21:33.322157+00	2026-10-19 04:21:42.840102+00
F0XetIE0c	Server Admin	#3B8282	1225	915	2026-10-19 04:21:42.114454+00	2026-10-19 04:21:45.089673+00
wa0IWCovj	Server Admin	#3B8282	1142.8502800150152	869.1102800150152	2026-10-17 13:52:44.768977+00	2026-10-17 13:53:34.975402+00
sAH-9DqF5	HEHE	#3B8282	1225	915	2026-10-19 04:21:44.265363+00	2026-10-19 04:21:45.089673+00
YxciJt_db	Server Admin	#3B8282	1225	915	2026-10-19 04:23:11.821628+00	2026-10-19 04:23:13.416684+00
n7wxdtMvU	Server Admin	#3B8282	1225	915	2026-10-19 06:47:08.88235+00	2026-10-19 06:47:20.614576+00
Uzos84LUF	HEHE	#3B8282	1225	915	2026-10-19 06:50:23.501631+00	2026-10-19 06:50:24.323715+00
brK0Z3lqF	firdausfadzi	#3B8282	1225	915	2026-10-19 03:55:52.977012+00	2026-10-19 03:56:41.692511+00
vhdEA3lKq	firdausfadzi	#3B8282	1225	915	2026-10-19 03:56:41.908969+00	2026-10-19 03:56:51.952352+00
o8xqgh71o	Server Admin	#7c5a5a	1034.4636803998244	1002.4036803998241	2026-10-19 03:38:28.389466+00	2026-10-19 03:47:03.011158+00
meftbpzkg	HEHE	#3B8282	1225	915	2026-10-19 06:47:09.198988+00	2026-10-19 06:47:21.322276+00
vJ9VwuHea	Server Admin	#3B8282	1225	915	2026-10-19 07:16:05.678827+00	2026-10-19 07:16:17.595944+00
1sZV6LTZj	Server Admin	#7c5a5a	1225	915	2026-10-19 04:01:18.7511+00	2026-10-19 04:01:28.168926+00
AMfFV2-FG	Server Admin	#7c5a5a	1225	915	2026-10-19 03:48:48.254949+00	2026-10-19 03:49:00.824291+00
f09Q5sk5y	Server Admin	#7c5a5a	1250	950	2026-10-17 13:11:58.171663+00	2026-10-17 13:13:47.161338+00
ZQvw2nrcG	Server Admin	#3B8282	1250	950	2026-10-17 13:11:42.25499+00	2026-10-17 13:13:48.101363+00
OOYKrqji-	Paih	#3B8282	749.4021660805874	762.2672771180057	2026-10-19 07:02:59.954189+00	2026-10-19 07:03:12.708642+00
KD7oKZyyY	Server Admin	#7c5a5a	1203.4865159335488	863.9665159335489	2026-10-17 13:19:43.849779+00	2026-10-17 13:19:53.203559+00
u_UMTwq-X	Pro Gamer	#7c5a5a	872.8075281629327	738.5475281629327	2026-10-19 03:36:07.236656+00	2026-10-19 03:38:17.589966+00
FrzFQ04Y4	HEHE	#3B8282	1225	915	2026-10-19 06:47:21.997033+00	2026-10-19 06:47:30.367056+00
xvzlMHsyY	firdausfadzi	#3B8282	1225	915	2026-10-19 03:50:38.446401+00	2026-10-19 03:52:45.699946+00
ZNs0Gxcul	firdausfadzi	#3B8282	1225	915	2026-10-19 04:02:56.507313+00	2026-10-19 04:03:20.360167+00
3L9-nk4sw	Pro Gamer	#7c5a5a	1225	915	2026-10-19 02:48:26.722249+00	2026-10-19 02:51:18.84412+00
gEv7fb4vz	Pro Gamer	#7c5a5a	1225	915	2026-10-19 02:51:55.667377+00	2026-10-19 02:51:55.667377+00
6oNileoKu	Server Admin	#3B8282	1225	915	2026-10-19 06:47:20.85784+00	2026-10-19 06:47:30.564912+00
_bqa3ZuHu	Server Admin	#7c5a5a	1225	915	2026-10-19 03:53:06.856399+00	2026-10-19 03:53:13.165875+00
UXPJfwfDm	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:19:48.659314+00	2026-10-19 03:19:55.261514+00
gZ8TXTagj	HEHE	#3B8282	1327.7649436741347	921.9875281629327	2026-10-19 06:54:46.171338+00	2026-10-19 06:55:02.660595+00
nFdNc2M97	Server Admin	#7c5a5a	1225	915	2026-10-19 03:53:13.318858+00	2026-10-19 03:53:39.795064+00
TMr4rmBxw	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:20:05.243405+00	2026-10-19 03:20:20.646729+00
WIvXSi8Nt	Server Admin	#7c5a5a	1225	915	2026-10-19 04:03:35.644189+00	2026-10-19 04:03:56.573069+00
9m42OojOA	Pro Gamer	#7c5a5a	864	727.3329739269201	2026-10-19 03:21:36.115043+00	2026-10-19 03:27:17.322831+00
l49kB4Uhe	firdausfadzi	#3B8282	1225	915	2026-10-19 03:49:00.902205+00	2026-10-19 03:50:29.634649+00
K5FnOEXVk	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:28:25.511479+00	2026-10-19 03:28:31.60515+00
j1CggP8I5	Paih	#3B8282	1283.2196652734315	772.4692758353086	2026-10-19 07:07:19.999941+00	2026-10-19 07:13:18.074554+00
jbgUE2lhx	Server Admin	#7c5a5a	1225	925	2026-10-17 13:43:34.647308+00	2026-10-17 13:48:01.476351+00
61tOh8OEC	Server Admin	#7c5a5a	1225	915	2026-10-19 03:53:39.86103+00	2026-10-19 03:54:01.072743+00
8ABwy1qkO	Server Admin	#7c5a5a	1091.997306088095	784.8658963709117	2026-10-17 13:19:53.845507+00	2026-10-17 13:41:14.151392+00
li2dckH-S	Server Admin	#3B8282	1223.48	1016.3	2026-10-17 13:20:03.152109+00	2026-10-17 13:41:15.096477+00
lYTjc2J2S	firdausfadzi	#3B8282	1225	915	2026-10-19 03:53:39.866023+00	2026-10-19 03:54:01.073236+00
4JRx0ptGw	Server Admin	#3B8282	1225	915	2026-10-19 06:47:37.499035+00	2026-10-19 06:48:01.807977+00
_YuNTmgnx	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:31:30.694962+00	2026-10-19 03:32:02.110115+00
WuPkv2-ZC	HEHE	#3B8282	1225	915	2026-10-19 06:47:38.890917+00	2026-10-19 06:48:01.847018+00
vmCeIgXVq	Pro Gamer	#3B8282	1225	915	2026-10-19 04:26:29.434807+00	2026-10-19 04:30:13.248024+00
w8RiVWtFq	Server Admin	#3B8282	1225	915	2026-10-19 04:15:54.43064+00	2026-10-19 04:20:38.547448+00
PEo2VNK4B	HEHE	#3B8282	1225	915	2026-10-19 06:50:25.894848+00	2026-10-19 06:51:09.564364+00
Lt4gYafAE	HEHE	#3B8282	1286.3215722594143	1353.0410122293833	2026-10-19 06:58:47.918568+00	2026-10-19 07:01:35.927968+00
l1lhY8I15	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:32:02.189372+00	2026-10-19 03:32:28.661846+00
Zdqxa816B	Server Admin	#3B8282	1225	915	2026-10-19 06:41:55.055991+00	2026-10-19 06:42:12.382976+00
JjYfRI-z_	Server Admin	#7c5a5a	1225	925	2026-10-17 13:42:05.44179+00	2026-10-17 13:42:30.993686+00
NsFGIx1B7	Server Admin	#3B8282	1225	925	2026-10-17 13:42:06.555691+00	2026-10-17 13:42:31.940016+00
Y-WJy7-SR	HEHE	#3B8282	1225	915	2026-10-19 06:48:23.336277+00	2026-10-19 06:48:29.255613+00
9IFLiNOO2	HEHE	#3B8282	1225	915	2026-10-19 04:20:39.696591+00	2026-10-19 04:20:54.908498+00
ENIFijsHz	Server Admin	#3B8282	1225	915	2026-10-19 06:48:23.798497+00	2026-10-19 06:48:29.591594+00
WPB9FOKFs	Paih	#3B8282	1225	915	2026-10-19 07:13:19.669178+00	2026-10-19 07:13:38.612195+00
u0oHNZ6OP	firdausfadzi	#3B8282	1225	915	2026-10-19 03:54:01.214843+00	2026-10-19 03:55:02.349701+00
zzymUBcne	HEHE	#3B8282	1225	915	2026-10-19 04:20:55.245495+00	2026-10-19 04:21:00.761351+00
9q0uKAEWR	firdausfadzi	#3B8282	1225	915	2026-10-19 04:03:56.670365+00	2026-10-19 04:04:54.400106+00
VnBwd8VTQ	Pro Gamer	#7c5a5a	864	761.3399999999999	2026-10-19 02:28:05.753955+00	2026-10-19 02:47:05.181029+00
9vpoMTOCY	Server Admin	#7c5a5a	1225	915	2026-10-19 04:03:56.724026+00	2026-10-19 04:04:54.400106+00
yffP_O2dC	HEHE	#3B8282	1225	915	2026-10-19 04:23:56.84188+00	2026-10-19 04:25:22.962009+00
Jiy3dTXTv	Server Admin	#3B8282	1225	915	2026-10-19 04:21:00.030595+00	2026-10-19 04:21:04.823709+00
AwnJdy4YO	Pro Gamer	#3B8282	1225	915	2026-10-19 04:23:46.505669+00	2026-10-19 04:25:23.874501+00
veGD4i7vo	HEHE	#3B8282	1225	915	2026-10-19 04:21:01.031328+00	2026-10-19 04:21:05.779289+00
XnLj2gAYZ	Server Admin	#3B8282	1225	915	2026-10-19 06:48:30.129379+00	2026-10-19 06:48:37.157389+00
zkivXXQDX	HEHE	#3B8282	1225	915	2026-10-19 06:48:30.006845+00	2026-10-19 06:48:37.319639+00
9NrVWnpBf	Server Admin	#3B8282	1225	915	2026-10-19 07:16:17.681532+00	2026-10-19 07:17:52.559686+00
h8QHGrImX	HEHE	#3B8282	1225	915	2026-10-19 06:48:46.536058+00	2026-10-19 06:49:03.373981+00
jNW20n0ym	HEHE	#3B8282	1304.56	888.74	2026-10-19 07:01:36.491297+00	2026-10-19 07:01:47.29912+00
sbQj6JyRW	Server Admin	#3B8282	1225	915	2026-10-19 04:21:04.908473+00	2026-10-19 04:21:25.487625+00
6sni82Oqk	HEHE	#3B8282	1225	915	2026-10-19 04:21:06.079178+00	2026-10-19 04:21:25.853597+00
V6vEwSEbK	Server Admin	#3B8282	1225	915	2026-10-19 04:21:25.568694+00	2026-10-19 04:21:31.941093+00
2Lt9V998G	HEHE	#3B8282	1225	915	2026-10-19 04:21:26.248598+00	2026-10-19 04:21:32.782024+00
4cS7g6k-C	HEHE	#3B8282	841.9147714897966	937.4292677856314	2026-10-19 06:51:09.978861+00	2026-10-19 06:52:34.201076+00
peqXuXQkK	HEHE	#3B8282	1266.3887077556008	969.1287077556009	2026-10-19 06:55:51.649238+00	2026-10-19 06:57:34.45029+00
qRXt0rMgN	Server Admin	#3B8282	1149.2730672506705	1010.045870629446	2026-10-19 06:50:02.654101+00	2026-10-19 06:57:34.622711+00
RInYpyLZ3	HEHE	#3B8282	1225	915	2026-10-19 06:53:53.347633+00	2026-10-19 06:53:59.994839+00
Ep8Y72ZKv	HEHE	#3B8282	1319.428707755601	931.3637640814663	2026-10-19 06:54:00.196779+00	2026-10-19 06:54:06.335328+00
D57IhNb8L	Server Admin	#3B8282	1225	915	2026-10-19 08:18:00.19273+00	2026-10-19 08:18:00.19273+00
dXCIxMVlz	Server Admin	#7c5a5a	1250	950	2026-10-17 13:19:53.258411+00	2026-10-17 13:19:53.795559+00
gnnCJWlJl	Server Admin	#7c5a5a	1250	950	2026-10-17 13:11:56.136782+00	2026-10-17 13:11:58.134302+00
i_ILYtke0	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:32:28.734281+00	2026-10-19 03:32:40.466878+00
N1yhwdxvI	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:17:32.597779+00	2026-10-19 03:17:39.704783+00
SfESOVMs5	Server Admin	#7c5a5a	1250	950	2026-10-17 13:04:23.34512+00	2026-10-17 13:05:42.24313+00
A36lOW-_l	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:29:00.934706+00	2026-10-19 03:29:12.169638+00
KElrmIKX4	Server Admin	#7c5a5a	933.7780334814105	619.5756742960733	2026-10-17 13:52:52.232957+00	2026-10-17 13:53:08.433891+00
mB4pPE0y5	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:19:55.38487+00	2026-10-19 03:20:05.152068+00
M1li8k-13	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:33:22.19682+00	2026-10-19 03:33:27.28848+00
vKFPIxZV6	Server Admin	#7c5a5a	1225	915	2026-10-19 03:55:02.540467+00	2026-10-19 03:55:38.702351+00
pjpkiK4Tq	Pro Gamer	#7c5a5a	1225	915	2026-10-19 03:29:12.233879+00	2026-10-19 03:29:18.825172+00
TmyagBHfp	firdausfadzi	#3B8282	1225	915	2026-10-19 03:55:02.638567+00	2026-10-19 03:55:38.707463+00
7QaVCHYaR	Paih	#3B8282	1225	915	2026-10-19 07:16:07.343938+00	2026-10-19 07:16:17.46786+00
Rt4rvsyaZ	Server Admin	#7c5a5a	1225	915	2026-10-19 03:56:41.791948+00	2026-10-19 03:56:51.952251+00
RnX5aR-hc	Server Admin	#7c5a5a	1225	925	2026-10-17 13:42:31.039007+00	2026-10-17 13:43:14.165226+00
JjZeNNsvs	Server Admin	#3B8282	1225	925	2026-10-17 13:42:32.107822+00	2026-10-17 13:43:15.108523+00
ewMOcRpbz	Server Admin	#7c5a5a	1225	925	2026-10-17 13:48:01.652062+00	2026-10-17 13:48:02.955742+00
9etSiPKi0	Server Admin	#7c5a5a	1225	915	2026-10-19 03:50:38.419937+00	2026-10-19 03:52:45.699928+00
21XEDrUbc	firdausfadzi	#3B8282	1225	915	2026-10-19 04:01:18.750476+00	2026-10-19 04:01:28.172496+00
iBHBe6itw	Server Admin	#7c5a5a	856.2015465179503	800.004015126393	2026-10-17 13:53:08.4423+00	2026-10-17 15:07:18.755226+00
Fd_Rd1fGV	Server Admin	#3B8282	1225	915	2026-10-19 04:22:36.449917+00	2026-10-19 04:23:10.609511+00
v7R0As7OA	firdausfadzi	#3B8282	1225	915	2026-10-19 03:53:13.276561+00	2026-10-19 03:53:39.788633+00
K8Iz08UQk	Server Admin	#3B8282	1225	915	2026-10-19 04:23:13.509278+00	2026-10-19 04:23:28.716232+00
suLVkmXnT	firdausfadzi	#3B8282	1062.3753653109693	959.1867750281534	2026-10-19 03:38:07.546106+00	2026-10-19 03:47:03.000007+00
MeOamXDby	Server Admin	#7c5a5a	1225	915	2026-10-19 04:01:28.225181+00	2026-10-19 04:01:43.484261+00
IkSXIOipP	firdausfadzi	#3B8282	1225	915	2026-10-19 04:01:28.270931+00	2026-10-19 04:01:43.484324+00
HxPPpkd-u	HEHE	#3B8282	1271.1897199849848	854.6323044737828	2026-10-19 06:55:02.772339+00	2026-10-19 06:55:51.447299+00
mJ8eKx2iW	firdausfadzi	#3B8282	1225	915	2026-10-19 03:48:48.275142+00	2026-10-19 03:49:00.835876+00
UoLSNr-d1	Server Admin	#3B8282	1225	915	2026-10-19 04:23:28.78323+00	2026-10-19 04:23:32.705231+00
dpobBshGv	Paih	#3B8282	1105.9705648510844	1004.8397827462163	2026-10-19 07:02:36.135264+00	2026-10-19 07:02:59.491514+00
1el5dXzL1	Server Admin	#7c5a5a	1225	915	2026-10-19 04:02:56.502998+00	2026-10-19 04:03:20.363051+00
UZy2ls6bR	Server Admin	#3B8282	1225	915	2026-10-19 07:02:34.743187+00	2026-10-19 07:02:59.493138+00
fFMoFGn02	HEHE	#3B8282	1225	915	2026-10-19 07:02:35.99102+00	2026-10-19 07:02:59.631351+00
xpCYGmhpt	HEHE	#3B8282	1230.2324718370674	962.1798326367157	2026-10-19 06:52:34.785958+00	2026-10-19 06:53:53.030669+00
oHRgykcDA	Server Admin	#7c5a5a	1225	915	2026-10-19 03:54:01.177513+00	2026-10-19 03:55:02.354835+00
R0UWwNk1Q	firdausfadzi	#3B8282	1225	915	2026-10-19 04:03:20.540002+00	2026-10-19 04:03:27.317302+00
krAXjgjFU	Server Admin	#7c5a5a	1225	915	2026-10-19 04:03:20.539738+00	2026-10-19 04:03:27.325736+00
P_6GH9K3x	HEHE	#3B8282	1225	915	2026-10-19 07:17:54.232424+00	2026-10-19 07:18:04.446129+00
aBDYkRXCf	HEHE	#3B8282	1225	915	2026-10-19 07:03:00.189992+00	2026-10-19 07:03:12.707077+00
AK7d9C107	HEHE	#3B8282	1225	915	2026-10-19 06:54:06.525142+00	2026-10-19 06:54:18.842909+00
EKd4DG3Fl	Server Admin	#3B8282	1225	915	2026-10-19 07:02:59.646155+00	2026-10-19 07:03:12.707089+00
ugflCMDKV	Server Admin	#7c5a5a	1225	915	2026-10-19 04:03:27.490972+00	2026-10-19 04:03:35.38686+00
PPZwCwkvV	firdausfadzi	#3B8282	1225	915	2026-10-19 04:03:27.392752+00	2026-10-19 04:03:35.390279+00
BvV8rVfDB	Paih	#3B8282	1225	915	2026-10-19 07:17:53.0468+00	2026-10-19 07:18:04.459581+00
Po-1JrIvu	Server Admin	#3B8282	1225	915	2026-10-19 07:17:52.659798+00	2026-10-19 07:18:04.600821+00
swc6BXhhl	nooogel	#3B8282	1187.86576279877	553.7174976004144	2026-10-19 07:32:12.235173+00	2026-10-19 07:36:40.193331+00
uJTVrcEkI	HEHE	#3B8282	1175.9514596076833	1024.1837640814665	2026-10-19 06:54:19.047531+00	2026-10-19 06:54:40.845212+00
KoQIE0Iun	firdausfadzi	#3B8282	1225	915	2026-10-19 04:03:35.643743+00	2026-10-19 04:03:56.567205+00
8OymyIvlK	HEHE	#3B8282	1225	915	2026-10-19 04:25:23.454926+00	2026-10-19 04:30:13.24802+00
MG9u-1TCO	HEHE	#3B8282	1225	915	2026-10-19 07:18:05.112981+00	2026-10-19 07:18:25.740798+00
pqkipGQTG	HEHE	#3B8282	1389.2660395851601	909.8109832592949	2026-10-19 04:15:09.61298+00	2026-10-19 04:20:38.892081+00
WzVONpQig	Server Admin	#3B8282	1225	915	2026-10-19 04:20:54.014591+00	2026-10-19 04:20:59.962932+00
nJXdyQwis	Pro Gamer	#3B8282	1225	915	2026-10-19 04:25:23.974977+00	2026-10-19 04:26:29.260338+00
K7vGapM3_	Paih	#3B8282	1225	915	2026-10-19 07:18:31.785982+00	2026-10-19 07:18:44.560993+00
-9VC4Yjwb	Server Admin	#3B8282	1034.5713759260414	986.8686240739587	2026-10-19 04:09:52.828371+00	2026-10-19 04:14:31.336474+00
8ArBjhbqy	HEHE	#3B8282	1195.4994641190046	681.8869922819372	2026-10-19 07:25:45.966604+00	2026-10-19 07:28:11.781194+00
jsVmIoY0U	Server Admin	#3B8282	1225	915	2026-10-19 06:57:34.887877+00	2026-10-19 06:58:46.72764+00
U_j-ebkEW	HEHE	#3B8282	1225	915	2026-10-19 06:57:35.080648+00	2026-10-19 06:58:47.371844+00
6ECHk7zAY	Server Admin	#3B8282	1344.5410122293838	985.2914596076835	2026-10-19 07:07:24.494587+00	2026-10-19 07:13:11.34841+00
OS_T5Ype-	HEHE	#3B8282	1357.4758432517865	887.8463485702645	2026-10-19 07:06:51.832636+00	2026-10-19 07:13:11.434801+00
4JHxhlXsc	Server Admin	#3B8282	1279.393641787627	1356.496461221995	2026-10-19 06:58:47.064326+00	2026-10-19 07:01:35.855465+00
FG3VaAk52	Server Admin	#3B8282	1277.52	981.04	2026-10-19 04:15:30.595815+00	2026-10-19 04:15:54.277392+00
K5ok5Ueve	Paih	#3B8282	1085.034018355018	1295.108791437243	2026-10-19 06:59:40.36837+00	2026-10-19 07:01:35.883944+00
xHXGLTPin	HEHE	#3B8282	1052.2351400075077	925.5351400075076	2026-10-19 06:43:09.900198+00	2026-10-19 06:47:08.432349+00
Q5KAQHL1r	Server Admin	#3B8282	1093.5161522368915	954.8561522368914	2026-10-19 06:42:13.044647+00	2026-10-19 06:47:08.595914+00
47nAvg4Si	Server Admin	#3B8282	1225	915	2026-10-19 06:47:30.807359+00	2026-10-19 06:47:37.244822+00
oawrEQg4k	HEHE	#3B8282	1225	915	2026-10-19 06:47:30.800802+00	2026-10-19 06:47:38.309388+00
UcPCCAeUt	HEHE	#3B8282	1225	915	2026-10-19 07:13:13.431385+00	2026-10-19 07:13:38.470927+00
-hyHs1cho	Server Admin	#3B8282	1406.1344962958349	1190.1996073332539	2026-10-19 07:01:36.16442+00	2026-10-19 07:02:14.818972+00
Wv33Hl2XP	Paih	#3B8282	1239.302785643226	1427.6541277781237	2026-10-19 07:01:36.444617+00	2026-10-19 07:02:14.964485+00
oS2vuD8xM	HEHE	#3B8282	1225	915	2026-10-19 06:48:04.53204+00	2026-10-19 06:48:22.376855+00
vNYPy3S6Y	HEHE	#3B8282	1225	915	2026-10-19 07:01:47.793605+00	2026-10-19 07:02:15.01035+00
l6UDMqAo2	Server Admin	#3B8282	1225	915	2026-10-19 06:48:04.100506+00	2026-10-19 06:48:22.93525+00
vG_SpJrsb	Server Admin	#3B8282	1225	915	2026-10-19 07:13:13.329507+00	2026-10-19 07:13:38.584793+00
wHkt0KXLn	Server Admin	#3B8282	1384.3370228444558	714.3229771555441	2026-10-19 07:05:07.132312+00	2026-10-19 07:06:02.076905+00
8M2lnnWLz	Server Admin	#3B8282	1225	915	2026-10-19 06:48:46.536678+00	2026-10-19 06:49:03.374007+00
zk10-5xAN	Server Admin	#3B8282	1225	915	2026-10-19 07:02:15.035859+00	2026-10-19 07:02:34.499524+00
ig7YmjAnp	HEHE	#3B8282	1328.4372481479174	991.6572481479175	2026-10-19 07:02:15.638842+00	2026-10-19 07:02:35.364598+00
CVez4uCJT	Paih	#3B8282	1225	915	2026-10-19 07:02:15.773273+00	2026-10-19 07:02:35.408732+00
6IpykdLbq	Server Admin	#3B8282	1225	915	2026-10-19 07:13:38.754748+00	2026-10-19 07:14:24.608103+00
eWGVgOZuy	Paih	#3B8282	1225	915	2026-10-19 07:13:40.841733+00	2026-10-19 07:14:24.725206+00
oZDSi_xP6	HEHE	#3B8282	1225	915	2026-10-19 07:13:40.703403+00	2026-10-19 07:14:24.768885+00
AS2DcbacT	HEHE	#3B8282	1153.5708995776536	793.3259559035185	2026-10-19 07:03:20.468953+00	2026-10-19 07:06:50.315067+00
n1eaBKfq1	Server Admin	#3B8282	1302.117106526098	876.3628934739017	2026-10-19 07:06:02.495292+00	2026-10-19 07:07:04.332474+00
lrlyCG1nj	Paih	#3B8282	1115.4110411994725	817.023680399824	2026-10-19 07:06:29.264754+00	2026-10-19 07:07:19.585702+00
iCo3bBahX	Server Admin	#3B8282	1225	915	2026-10-19 07:07:04.606816+00	2026-10-19 07:07:26.491044+00
IapnOTU_Q	Server Admin	#3B8282	1225	915	2026-10-19 09:04:55.301399+00	2026-10-19 09:04:55.301399+00
oxys8bWJY	HEHE	#3B8282	1225	915	2026-10-19 09:04:55.43022+00	2026-10-19 09:04:55.43022+00
Fz6ZBYWBE	HEHE	#3B8282	1225	915	2026-10-19 07:16:07.127143+00	2026-10-19 07:16:18.499148+00
k2bX7SqE0	Paih	#3B8282	1225	915	2026-10-19 09:04:56.895796+00	2026-10-19 09:04:56.895796+00
m5GTBAL1K	HEHE	#3B8282	1225	915	2026-10-20 07:52:52.582969+00	2026-10-20 07:52:52.582969+00
LvIO3QsiO	Paih	#3B8282	1225	915	2026-10-19 07:14:26.412074+00	2026-10-19 07:14:56.052976+00
HfTvlWLFm	Server Admin	#3B8282	1225	915	2026-10-19 10:07:39.779483+00	2026-10-19 10:07:41.805147+00
PHleahOMW	HEHE	#3B8282	1225	915	2026-10-19 08:18:50.531923+00	2026-10-19 08:18:56.30878+00
5uI-G_oVS	Paih	#3B8282	1225	915	2026-10-19 08:18:51.004514+00	2026-10-19 08:18:56.542121+00
_ySXbzWjO	Server Admin	#3B8282	1225	915	2026-10-19 08:18:49.729567+00	2026-10-19 08:18:56.560496+00
waIHdKaE9	Server Admin	#3B8282	1225	915	2026-10-19 08:35:48.774401+00	2026-10-19 08:35:54.67099+00
J1S7lSYfX	Paih	#3B8282	1225	915	2026-10-19 09:08:44.241181+00	2026-10-19 09:09:58.632715+00
y_2Jf5zXI	HEHE	#3B8282	1225	915	2026-10-19 08:35:48.910197+00	2026-10-19 08:35:55.330567+00
jZGOvFQff	Paih	#3B8282	1225	915	2026-10-19 07:18:04.915095+00	2026-10-19 07:18:25.415589+00
dvhMMnICx	Server Admin	#3B8282	1225	915	2026-10-19 07:18:04.685758+00	2026-10-19 07:18:27.066187+00
15vVI_-1Z	HEHE	#3B8282	1225	915	2026-10-19 08:22:55.027321+00	2026-10-19 08:23:08.834208+00
ALKmtVHjH	Paih	#3B8282	1225	915	2026-10-19 08:22:55.269419+00	2026-10-19 08:23:08.834287+00
zgwY0eLZB	HEHE	#3B8282	1225	915	2026-10-19 07:18:32.300039+00	2026-10-19 07:18:42.710366+00
2-T-A86n5	Server Admin	#3B8282	1225	915	2026-10-19 08:22:54.69933+00	2026-10-19 08:23:08.834183+00
AhH3ZJdJ-	HEHE	#3B8282	1250.4356163558957	806.6657290076267	2026-10-19 07:40:18.95275+00	2026-10-19 07:51:58.27984+00
10NNsJwcp	Server Admin	#3B8282	1225	915	2026-10-19 08:20:01.31941+00	2026-10-19 08:20:11.593961+00
u2cX4_am7	Paih	#3B8282	1225	915	2026-10-19 08:20:01.570441+00	2026-10-19 08:20:12.634428+00
7pYc8tC8_	Paih	#3B8282	1225	915	2026-10-19 08:35:49.445409+00	2026-10-19 08:35:55.570273+00
QvRv06RC2	Server Admin	#3B8282	1225	915	2026-10-19 09:07:54.726498+00	2026-10-19 09:08:11.593715+00
ATmJLzQ93	HEHE	#3B8282	1225	915	2026-10-19 09:23:57.985504+00	2026-10-19 09:24:10.02742+00
P2SdfTVnf	Server Admin	#3B8282	1094.8589040889742	1053.5363196001758	2026-10-20 01:22:46.947552+00	2026-10-20 01:22:57.171814+00
vHSFwIAr_	Server Admin	#3B8282	1225	915	2026-10-19 10:24:36.158087+00	2026-10-19 10:24:43.393519+00
qjMR7odRP	HEHE	#3B8282	1104.88	623.5400000000002	2026-10-19 07:28:12.429734+00	2026-10-19 07:36:40.3598+00
1XpcY4qa_	Server Admin	#3B8282	1169.0400836816418	670.0749726442234	2026-10-19 07:28:09.993745+00	2026-10-19 07:36:40.595984+00
WxyZKWqGI	HEHE	#3B8282	1225	915	2026-10-19 07:36:41.191028+00	2026-10-19 07:36:41.191028+00
SkTrYILj8	Paih	#3B8282	1225	915	2026-10-19 07:36:43.186573+00	2026-10-19 07:36:43.186573+00
ZFWaswzs7	Paih	#3B8282	1219.292137110498	780.330280015015	2026-10-19 09:56:48.94922+00	2026-10-19 09:57:13.063543+00
p9NPNOzJC	Server Admin	#3B8282	1226.1161522368916	703.5438477631086	2026-10-19 07:25:22.117978+00	2026-10-19 07:28:09.770833+00
lIa8jcwFY	HEHE	#3B8282	1225	915	2026-10-19 10:24:39.021811+00	2026-10-19 10:24:43.76171+00
dhjXiwnNX	HEHE	#3B8282	1225	915	2026-10-19 09:08:29.028203+00	2026-10-19 09:08:43.527118+00
ZgDOMpV2k	Server Admin	#3B8282	1145.7	835.96	2026-10-19 08:35:54.98119+00	2026-10-19 08:36:05.131729+00
Nz7rfe_dg	HEHE	#3B8282	1225	915	2026-10-19 08:35:56.533998+00	2026-10-19 08:36:05.331735+00
E5pB0p7r1	Paih	#3B8282	1225	915	2026-10-19 08:35:56.426221+00	2026-10-19 08:36:05.597571+00
R4ZeXuKJj	Paih	#3B8282	1225	915	2026-10-19 09:08:29.228429+00	2026-10-19 09:08:43.705153+00
LX2xVwdn6	Server Admin	#3B8282	1225	915	2026-10-19 08:36:46.288866+00	2026-10-19 08:36:52.587787+00
Fw0J5z2lO	HEHE	#3B8282	1225	915	2026-10-19 08:36:46.672116+00	2026-10-19 08:36:54.393357+00
pXU6LKbpv	Server Admin	#3B8282	1225	915	2026-10-19 07:45:44.7827+00	2026-10-19 07:45:47.926103+00
uPqS_Hiu2	Paih	#3B8282	1225	915	2026-10-19 08:36:46.709862+00	2026-10-19 08:36:54.495526+00
TfZbsfG7h	HEHE	#3B8282	1243.7037640814663	825.2837640814664	2026-10-20 01:43:46.673629+00	2026-10-20 01:59:25.284946+00
YGe9CHY8-	Server Admin	#3B8282	1225	915	2026-10-20 01:59:51.99596+00	2026-10-20 01:59:58.983916+00
kjzqoY_pA	Paih	#3B8282	1202.1281976160697	536.2475281629328	2026-10-19 09:57:45.641484+00	2026-10-19 09:58:37.778381+00
z9NY2fyl_	HEHE	#3B8282	1225	915	2026-10-20 02:00:00.664214+00	2026-10-20 02:00:02.152457+00
ekzCDXx6Y	HEHE	#3B8282	1225	915	2026-10-19 08:34:53.200084+00	2026-10-19 08:35:41.415119+00
-XLFTVp9Q	Server Admin	#3B8282	1225	915	2026-10-19 08:34:52.79116+00	2026-10-19 08:35:41.644036+00
-l4I62d3Y	Paih	#3B8282	1225	915	2026-10-19 08:34:53.203611+00	2026-10-19 08:35:41.76687+00
08pxOVcI7	Server Admin	#3B8282	1225	915	2026-10-19 10:08:10.074723+00	2026-10-19 10:09:41.642892+00
KjpfGdmBY	HEHE	#3B8282	1225	915	2026-10-19 09:09:59.296704+00	2026-10-19 09:10:32.518524+00
tXOdJslp3	Server Admin	#3B8282	1225	915	2026-10-19 09:09:58.718349+00	2026-10-19 09:10:32.614089+00
2yKS-fjbH	Paih	#3B8282	1225	915	2026-10-19 09:09:59.149981+00	2026-10-19 09:10:32.710322+00
QNAsNbVCW	HEHE	#3B8282	1225	915	2026-10-20 02:02:51.339663+00	2026-10-20 02:03:00.766602+00
USHzPPS6s	Server Admin	#3B8282	1225	915	2026-10-19 09:10:32.740233+00	2026-10-19 09:10:47.603272+00
-dLs_ypAm	HEHE	#3B8282	1225	915	2026-10-19 09:10:33.151175+00	2026-10-19 09:10:47.603765+00
Snk-io8jJ	Paih	#3B8282	1225	915	2026-10-19 09:10:33.28822+00	2026-10-19 09:10:47.689558+00
y9KuoO_z4	abbeyonde	#3B8282	1208.4635967181825	794.5266832968331	2026-10-19 07:34:23.399627+00	2026-10-19 07:34:46.148494+00
G1PuGzIx_	HEHE	#3B8282	1225	915	2026-10-19 09:13:40.406197+00	2026-10-19 09:13:54.819813+00
EI4kiD1ws	Server Admin	#3B8282	1211.8417396226987	775.3399999999999	2026-10-19 10:00:58.99352+00	2026-10-19 10:01:23.003101+00
lBK7iUL3w	Paih	#3B8282	1110.3533167031671	500.19505632586544	2026-10-19 09:58:38.376459+00	2026-10-19 10:01:24.014652+00
TrxJFUeN9	HEHE	#3B8282	1193.691375926041	618.4913759260413	2026-10-19 08:38:08.382851+00	2026-10-19 08:41:11.962769+00
u37YYCW82	Server Admin	#3B8282	1225	915	2026-10-19 08:41:26.554098+00	2026-10-19 08:41:37.38812+00
edepNnAVd	Paih	#3B8282	1225	915	2026-10-19 08:41:28.726103+00	2026-10-19 08:41:37.620182+00
F6x1t3NbJ	HEHE	#3B8282	1225	915	2026-10-19 08:42:14.322043+00	2026-10-19 08:42:16.010121+00
7lwlBBpIe	Server Admin	#3B8282	1225	915	2026-10-19 10:01:42.469576+00	2026-10-19 10:01:55.59333+00
HX-lDj6eY	Paih	#3B8282	1225	915	2026-10-19 10:01:43.745499+00	2026-10-19 10:01:55.768572+00
j_TcIZFLs	Server Admin	#3B8282	1225	915	2026-10-19 08:42:16.154388+00	2026-10-19 08:42:17.375823+00
gxSBGQS1c	Paih	#3B8282	1225	915	2026-10-19 08:42:17.316565+00	2026-10-19 08:42:17.375854+00
HtVtmSaSw	HEHE	#3B8282	1225	915	2026-10-19 08:42:16.857059+00	2026-10-19 08:42:17.375888+00
AheeEEYwB	HEHE	#3B8282	1225	915	2026-10-19 10:01:45.108372+00	2026-10-19 10:01:55.875449+00
_yqkMtB7e	Server Admin	#3B8282	1225	915	2026-10-19 10:02:05.7347+00	2026-10-19 10:02:17.360394+00
TjALfElDr	Paih	#3B8282	1122.9999999999998	445.05789185959037	2026-10-19 10:02:05.926864+00	2026-10-19 10:02:17.360593+00
1nzAw7yDG	HEHE	#3B8282	975.3821322894455	496.64213228944504	2026-10-19 07:51:59.475247+00	2026-10-19 08:17:59.46826+00
9KdfvRewR	Server Admin	#3B8282	1127.2175828744864	673.2773060880947	2026-10-19 07:45:56.876105+00	2026-10-19 08:17:59.666898+00
Rx3ukZfnU	HEHE	#3B8282	1225	915	2026-10-19 08:18:00.448779+00	2026-10-19 08:18:00.448779+00
67k_XeWdQ	Paih	#3B8282	1225	915	2026-10-19 08:18:01.925922+00	2026-10-19 08:18:01.925922+00
PJ1wBNl1x	Server Admin	#3B8282	975.6492420441671	723.7897441340195	2026-10-20 01:22:57.323129+00	2026-10-20 01:31:10.737286+00
88F7bYxed	Server Admin	#3B8282	1225	915	2026-10-20 01:34:24.620252+00	2026-10-20 01:34:29.371902+00
QuoNlI353	Server Admin	#3B8282	1225	915	2026-10-20 01:34:29.593216+00	2026-10-20 01:34:34.105193+00
KpHrdFdJT	Server Admin	#3B8282	1225	915	2026-10-20 01:34:34.337665+00	2026-10-20 01:34:51.464329+00
VGa3EzQ_D	HEHE	#3B8282	1225	915	2026-10-20 01:34:52.466007+00	2026-10-20 01:34:56.651936+00
1gG5N1_Do	Server Admin	#3B8282	1225	915	2026-10-20 01:34:55.827226+00	2026-10-20 01:35:28.868074+00
bScVJU0j0	Server Admin	#3B8282	1225	915	2026-10-20 01:35:29.049991+00	2026-10-20 01:35:34.509932+00
sTtDR20Dn	HEHE	#3B8282	1225	915	2026-10-20 01:35:35.08773+00	2026-10-20 01:35:48.711862+00
69rPUd_Ks	HEHE	#3B8282	1225	915	2026-10-20 01:35:49.217865+00	2026-10-20 01:35:54.939564+00
c2D5h2gml	Server Admin	#3B8282	1225	915	2026-10-20 01:35:55.050013+00	2026-10-20 01:36:00.135988+00
IFTF9WDF3	Server Admin	#3B8282	1225	915	2026-10-19 08:35:41.847195+00	2026-10-19 08:35:48.561271+00
Hlk8qysTK	nooogel	#3B8282	1151.9717685927874	550.4136771712007	2026-10-19 07:37:22.808471+00	2026-10-19 08:06:53.285661+00
rlKXOjp7m	Server Admin	#3B8282	1225	915	2026-10-19 10:07:41.910043+00	2026-10-19 10:07:43.746466+00
1B7t1FurC	HEHE	#3B8282	1225	915	2026-10-19 07:14:26.295646+00	2026-10-19 07:14:55.428703+00
3ibPn6gDC	HEHE	#3B8282	1225	915	2026-10-19 08:18:56.77056+00	2026-10-19 08:19:04.351325+00
5Ib7AMIg_	Server Admin	#3B8282	1225	915	2026-10-19 08:18:56.672502+00	2026-10-19 08:19:04.567624+00
Cd9qwJjTj	Paih	#3B8282	1225	915	2026-10-19 08:18:56.962437+00	2026-10-19 08:19:04.573863+00
sTb6yCUDl	HEHE	#3B8282	1225	915	2026-10-19 08:22:08.712453+00	2026-10-19 08:22:54.38591+00
l6bOsvYL8	HEHE	#3B8282	1225	915	2026-10-19 07:14:56.267855+00	2026-10-19 07:15:05.334369+00
QnxKRaERV	Server Admin	#3B8282	1225	915	2026-10-19 07:14:55.762056+00	2026-10-19 07:15:05.557621+00
ETnWBHkyv	Server Admin	#3B8282	1225	915	2026-10-19 08:22:07.765999+00	2026-10-19 08:22:54.597136+00
bCyG3jDPc	Paih	#3B8282	1225	915	2026-10-19 07:14:57.283916+00	2026-10-19 07:15:05.720095+00
FBxMwDswo	Paih	#3B8282	1225	915	2026-10-19 08:22:08.585578+00	2026-10-19 08:22:54.671132+00
B66XtHZMV	Server Admin	#3B8282	1225	716.3600000000001	2026-10-19 10:10:25.922258+00	2026-10-19 10:10:47.611475+00
1Ba-qCDj-	Server Admin	#3B8282	1225	915	2026-10-19 08:36:05.413861+00	2026-10-19 08:36:14.910239+00
k4k34Ro25	HEHE	#3B8282	1225	915	2026-10-19 08:36:06.116509+00	2026-10-19 08:36:15.42967+00
VEcW2EoMr	Paih	#3B8282	1225	915	2026-10-19 08:36:06.630361+00	2026-10-19 08:36:15.573124+00
6C7sYE7do	Server Admin	#3B8282	1178.486515933549	815.706515933549	2026-10-20 01:43:13.675879+00	2026-10-20 01:59:25.284908+00
lP_q5jVQT	HEHE	#3B8282	1225	915	2026-10-19 09:10:48.169608+00	2026-10-19 09:11:07.541684+00
vmPMEulTQ	HEHE	#3B8282	1225	915	2026-10-19 07:15:05.935549+00	2026-10-19 07:15:23.290972+00
yiavXKHRu	Paih	#3B8282	1225	915	2026-10-19 07:15:06.618981+00	2026-10-19 07:15:23.583711+00
jBS65k3pq	Server Admin	#3B8282	1225	915	2026-10-19 07:15:05.737387+00	2026-10-19 07:15:23.647924+00
pL5K3jMrg	Server Admin	#3B8282	1225	915	2026-10-19 09:10:47.750597+00	2026-10-19 09:11:07.56477+00
SiPVS9Tgc	HEHE	#3B8282	1225	915	2026-10-19 08:19:04.978727+00	2026-10-19 08:19:26.415799+00
ROgCU-MI8	Server Admin	#3B8282	1225	915	2026-10-19 08:19:04.668688+00	2026-10-19 08:19:26.567111+00
NuYW3Jixw	Paih	#3B8282	1225	915	2026-10-19 08:19:05.113445+00	2026-10-19 08:19:26.579312+00
e5wnlwEMQ	Paih	#3B8282	1225	915	2026-10-19 09:10:48.204275+00	2026-10-19 09:11:07.659503+00
GAYAS64ab	HEHE	#3B8282	1225	915	2026-10-20 01:30:21.943939+00	2026-10-20 01:31:10.737269+00
KFRWvwNFx	HEHE	#3B8282	1225	915	2026-10-20 01:34:25.518839+00	2026-10-20 01:34:29.610845+00
UdfqZ_hWR	HEHE	#3B8282	1225	915	2026-10-19 08:20:01.577432+00	2026-10-19 08:20:12.391767+00
YDGauRnIA	Server Admin	#3B8282	1225	915	2026-10-19 10:24:43.511154+00	2026-10-19 10:25:13.451485+00
KTO9SCLVG	HEHE	#3B8282	1225	915	2026-10-19 10:24:44.489234+00	2026-10-19 10:25:14.001882+00
-E7KOJIf-	HEHE	#3B8282	1225	915	2026-10-20 01:34:30.177681+00	2026-10-20 01:34:34.655459+00
JKEgHK6QY	Paih	#3B8282	1225	915	2026-10-19 07:16:17.928+00	2026-10-19 07:17:52.466591+00
diUs385Dx	HEHE	#3B8282	1225	915	2026-10-20 01:59:52.83991+00	2026-10-20 01:59:59.682114+00
ktsJXciBF	HEHE	#3B8282	1225	915	2026-10-19 07:16:19.074084+00	2026-10-19 07:17:53.472774+00
KffxcTNRD	HEHE	#3B8282	1225	915	2026-10-19 07:18:45.854625+00	2026-10-19 07:18:45.854625+00
peTpi-Ztb	Server Admin	#3B8282	1225	915	2026-10-19 07:18:45.862796+00	2026-10-19 07:18:45.862796+00
KkG_U_CBc	Paih	#3B8282	1225	915	2026-10-19 07:18:45.955137+00	2026-10-19 07:18:45.955137+00
gRQKodl6x	Server Admin	#3B8282	1225	915	2026-10-20 01:59:59.221309+00	2026-10-20 02:00:02.152399+00
4gvH8XOMp	HEHE	#3B8282	1225	915	2026-10-20 01:34:35.401466+00	2026-10-20 01:34:51.651959+00
CceuCY8H_	HEHE	#3B8282	1225	915	2026-10-19 08:36:23.109421+00	2026-10-19 08:36:45.516966+00
hYz30oDu9	Server Admin	#3B8282	1225	915	2026-10-19 08:36:21.907291+00	2026-10-19 08:36:45.624552+00
qVc9RDIRl	Paih	#3B8282	1225	915	2026-10-19 08:36:23.305537+00	2026-10-19 08:36:45.630764+00
YrsBpFGNJ	Server Admin	#3B8282	1225	915	2026-10-20 01:34:51.687902+00	2026-10-20 01:34:55.590792+00
jrDlFqao_	HEHE	#3B8282	1225	915	2026-10-20 02:03:01.39394+00	2026-10-20 02:03:07.623774+00
Kksoi4Ivs	Server Admin	#3B8282	1225	915	2026-10-20 02:03:06.967585+00	2026-10-20 02:03:14.485312+00
bwd1W03Db	HEHE	#3B8282	1225	915	2026-10-19 09:26:07.534684+00	2026-10-19 10:01:23.950464+00
anzbsbZv5	Server Admin	#3B8282	1225	915	2026-10-19 10:25:13.61186+00	2026-10-19 10:25:48.242662+00
WzygiUPy1	Paih	#3B8282	1225	915	2026-10-19 08:36:57.215066+00	2026-10-19 08:37:16.573721+00
PzUMEnZMg	Server Admin	#3B8282	1225	915	2026-10-19 08:36:52.737066+00	2026-10-19 08:37:16.630677+00
cp08vvV49	HEHE	#3B8282	1225	915	2026-10-19 10:25:14.953142+00	2026-10-19 10:25:48.839774+00
Wyk9A_5yA	HEHE	#3B8282	1225	915	2026-10-19 08:41:13.246611+00	2026-10-19 08:41:14.578484+00
HPD-vQZSy	HEHE	#3B8282	1225	915	2026-10-19 08:41:16.351518+00	2026-10-19 08:41:18.082717+00
G3vVSRaVP	Server Admin	#3B8282	1225	915	2026-10-19 08:41:14.459784+00	2026-10-19 08:41:18.082607+00
uxIAKvFMy	HEHE	#3B8282	1225	915	2026-10-20 01:34:57.032129+00	2026-10-20 01:35:29.029078+00
iyFmCfyd6	Server Admin	#3B8282	1225	915	2026-10-19 10:25:48.436876+00	2026-10-19 10:25:53.260177+00
rMg1W-kiQ	HEHE	#3B8282	1225	915	2026-10-19 10:25:49.855271+00	2026-10-19 10:25:53.709123+00
PKm-AeC0o	HEHE	#3B8282	1225	915	2026-10-20 01:35:29.546404+00	2026-10-20 01:35:34.57603+00
RjaaOZFhK	Server Admin	#3B8282	1225	915	2026-10-19 10:26:15.517037+00	2026-10-19 10:26:28.073022+00
lZEScwo0n	Server Admin	#3B8282	1123.5837640814664	680.7237640814665	2026-10-19 07:40:28.299575+00	2026-10-19 07:45:44.66616+00
3xLIcxJze	Server Admin	#3B8282	1225	915	2026-10-19 10:01:23.167124+00	2026-10-19 10:01:42.350919+00
Of7iPfqT_	Paih	#3B8282	1148.7335677480935	232.6086240739592	2026-10-19 09:19:06.838314+00	2026-10-19 09:56:48.639343+00
PtXd7cTky	Paih	#3B8282	1225	915	2026-10-19 10:01:24.974057+00	2026-10-19 10:01:42.822055+00
Lx8ZjoATq	HEHE	#3B8282	1225	915	2026-10-19 10:01:25.480863+00	2026-10-19 10:01:44.416067+00
hUBx0KDcx	HEHE	#3B8282	1225	915	2026-10-19 08:20:12.931433+00	2026-10-19 08:21:23.437483+00
TnF4Ym8qZ	Server Admin	#3B8282	1158.7	915	2026-10-19 08:20:11.742069+00	2026-10-19 08:21:23.628004+00
FmimErXQy	Paih	#3B8282	1225	915	2026-10-19 08:20:13.026635+00	2026-10-19 08:21:23.657079+00
xzhqtvh2y	Server Admin	#3B8282	1225	915	2026-10-20 01:35:34.673156+00	2026-10-20 01:35:48.617001+00
li71zjMcS	HEHE	#3B8282	1225	915	2026-10-19 10:02:09.041895+00	2026-10-19 10:02:17.360403+00
emr8gGzRR	Server Admin	#3B8282	1225	915	2026-10-19 08:41:37.603554+00	2026-10-19 08:42:07.108754+00
dn2ck8IMy	Server Admin	#3B8282	1272.569494681523	900.7219665185908	2026-10-20 01:43:04.252722+00	2026-10-20 01:43:13.662896+00
zSohgrdq5	Paih	#3B8282	1225	915	2026-10-19 08:41:38.234161+00	2026-10-19 08:42:07.696744+00
USv0xiEgH	HEHE	#3B8282	1225	915	2026-10-19 08:41:38.159159+00	2026-10-19 08:42:07.779658+00
s_AGZMMdI	HEHE	#3B8282	1225	915	2026-10-20 02:03:15.247761+00	2026-10-20 02:04:15.433132+00
XEO5XPWFF	Server Admin	#3B8282	1225	915	2026-10-20 02:04:15.457423+00	2026-10-20 02:04:28.120295+00
4Hh3-7h-9	HEHE	#3B8282	1225	915	2026-10-20 02:04:28.785136+00	2026-10-20 02:04:34.587642+00
bfA8ToujI	Server Admin	#3B8282	1225	915	2026-10-19 09:05:49.752223+00	2026-10-19 09:07:43.58079+00
Zo-GT0uG7	HEHE	#3B8282	1225	915	2026-10-19 09:05:51.187163+00	2026-10-19 09:07:43.629351+00
QLA4Hjp_q	Paih	#3B8282	1225	915	2026-10-19 09:05:50.688493+00	2026-10-19 09:07:43.660718+00
_3bK_Q1b9	Paih	#3B8282	14	477.0157000375382	2026-10-19 09:57:18.66189+00	2026-10-19 09:57:45.114992+00
-3wUFGdeb	Server Admin	#3B8282	1225	915	2026-10-20 02:04:34.693754+00	2026-10-20 02:04:44.35234+00
QW-jeO7tI	HEHE	#3B8282	1225	915	2026-10-19 09:07:55.237416+00	2026-10-19 09:08:11.529933+00
60muy0C6q	Paih	#3B8282	1225	915	2026-10-19 09:07:55.281283+00	2026-10-19 09:08:11.586613+00
WEE_x5jG0	Server Admin	#3B8282	1225	915	2026-10-19 09:08:28.683548+00	2026-10-19 09:08:43.58693+00
yIPDCRcOn	Server Admin	#3B8282	1172.185788540234	638.4873270085061	2026-10-19 08:25:53.24883+00	2026-10-19 08:33:46.039913+00
vr6UgQunF	Server Admin	#3B8282	1083.690112651731	655.130112651731	2026-10-19 10:26:37.255556+00	2026-10-19 10:30:04.768571+00
11MjRxROw	HEHE	#3B8282	1225	915	2026-10-19 10:26:38.273743+00	2026-10-19 10:30:04.768551+00
LKH-TevdD	Server Admin	#3B8282	1225	915	2026-10-19 08:34:30.045432+00	2026-10-19 08:34:30.045432+00
jz-ehbGps	HEHE	#3B8282	1225	915	2026-10-19 08:34:31.475946+00	2026-10-19 08:34:31.475946+00
FF6Ez_yps	Paih	#3B8282	1225	915	2026-10-19 08:34:33.278478+00	2026-10-19 08:34:33.278478+00
trLjGb2it	HEHE	#3B8282	1225	915	2026-10-20 01:33:21.392047+00	2026-10-20 01:33:21.392047+00
S-moWrIM8	Server Admin	#3B8282	1200.4564032818178	793.4235967181821	2026-10-19 07:40:12.118094+00	2026-10-19 07:40:28.182253+00
11iRhuXdk	Server Admin	#3B8282	1225	915	2026-10-19 07:14:25.834632+00	2026-10-19 07:14:55.645358+00
7roAC5Qhn	Server Admin	#3B8282	1225	915	2026-10-20 01:33:21.558216+00	2026-10-20 01:33:21.558216+00
elGuFpcKv	abbeyonde	#3B8282	1225	915	2026-10-20 03:36:16.20317+00	2026-10-20 03:36:19.406143+00
DlxDcxmZB	HEHE	#3B8282	1225	915	2026-10-19 08:35:42.074714+00	2026-10-19 08:35:48.336593+00
xkBmqBo8j	Paih	#3B8282	1225	915	2026-10-19 08:35:42.4463+00	2026-10-19 08:35:48.590111+00
BILv0wlwm	Server Admin	#3B8282	1225	915	2026-10-19 08:19:26.669026+00	2026-10-19 08:19:39.600708+00
gNXcyZDfb	Paih	#3B8282	1225	915	2026-10-19 08:19:27.168746+00	2026-10-19 08:19:39.65343+00
eG8Yl9ajt	Server Admin	#3B8282	1225	915	2026-10-20 01:35:48.801994+00	2026-10-20 01:35:54.865938+00
4pyh8A_pv	HEHE	#3B8282	1225	915	2026-10-19 08:19:27.226235+00	2026-10-19 08:19:40.366177+00
wdqHgtZx3	HEHE	#3B8282	1225	915	2026-10-19 09:08:44.242091+00	2026-10-19 09:09:58.538598+00
fvtyFLvt1	Server Admin	#3B8282	1225	915	2026-10-19 09:08:43.695373+00	2026-10-19 09:09:58.579608+00
wZ6y5OOnb	Server Admin	#3B8282	1225	915	2026-10-19 10:07:43.853333+00	2026-10-19 10:08:09.961683+00
bD_jy76Yh	Server Admin	#3B8282	1225	915	2026-10-19 07:15:23.784631+00	2026-10-19 07:16:05.576122+00
4lOXBbCfr	Paih	#3B8282	1225	915	2026-10-19 07:15:24.142326+00	2026-10-19 07:16:06.460993+00
AOxILaT6k	HEHE	#3B8282	1225	915	2026-10-19 07:15:23.998961+00	2026-10-19 07:16:06.461021+00
Sp6ELNtun	HEHE	#3B8282	1225	915	2026-10-19 09:07:44.287818+00	2026-10-19 09:07:54.514445+00
Ts1u3_tq5	Server Admin	#3B8282	1225	915	2026-10-19 08:36:15.084562+00	2026-10-19 08:36:21.752422+00
qHy6QXAfz	Server Admin	#3B8282	1225	915	2026-10-19 07:18:32.82002+00	2026-10-19 07:18:44.602249+00
wPF-0NPrw	HEHE	#3B8282	1225	915	2026-10-19 08:36:16.135559+00	2026-10-19 08:36:22.31852+00
kHyx41tZ1	Paih	#3B8282	1225	915	2026-10-19 08:36:16.776891+00	2026-10-19 08:36:22.571069+00
SHvG1jb62	Server Admin	#3B8282	1225	915	2026-10-19 09:07:43.754098+00	2026-10-19 09:07:54.597+00
rb_xEPgof	Paih	#3B8282	1225	915	2026-10-19 09:07:44.388372+00	2026-10-19 09:07:54.606021+00
DMExS66s2	Server Admin	#3B8282	1225	915	2026-10-19 07:25:04.184211+00	2026-10-19 07:25:21.916433+00
d_DH1CXxD	HEHE	#3B8282	1225	915	2026-10-20 01:35:55.544729+00	2026-10-20 01:36:00.135928+00
EoktR0fGn	Server Admin	#3B8282	1225	915	2026-10-20 02:02:50.174065+00	2026-10-20 02:03:00.375979+00
ucVD-K0YA	HEHE	#3B8282	1225	915	2026-10-19 08:36:57.218212+00	2026-10-19 08:37:16.472533+00
SpIV5nK5W	Server Admin	#3B8282	1225	915	2026-10-20 02:08:44.224127+00	2026-10-20 02:08:51.201137+00
t7xH8L7GE	HEHE	#3B8282	1225	915	2026-10-19 08:19:40.884225+00	2026-10-19 08:20:00.456793+00
gl26HZvmS	Server Admin	#3B8282	1225	915	2026-10-19 08:19:39.724248+00	2026-10-19 08:20:00.605924+00
1NYu00Ek5	Paih	#3B8282	1225	915	2026-10-19 08:19:40.161491+00	2026-10-19 08:20:00.663816+00
O1KqCavQ8	HEHE	#3B8282	1225	915	2026-10-20 02:08:44.627136+00	2026-10-20 02:08:51.326848+00
TXO4i1_GU	Server Admin	#3B8282	1225	915	2026-10-20 02:03:00.571841+00	2026-10-20 02:03:06.729426+00
h6csrmTpi	HEHE	#3B8282	1225	915	2026-10-19 09:11:08.230137+00	2026-10-19 09:11:17.849029+00
-RGsvywv2	Paih	#3B8282	1225	915	2026-10-19 09:11:08.305598+00	2026-10-19 09:11:17.849056+00
KbKnIvKI1	Server Admin	#3B8282	1225	915	2026-10-19 09:11:07.730227+00	2026-10-19 09:11:17.849016+00
gV9SYF5g7	HEHE	#3B8282	1225	915	2026-10-19 08:37:17.685387+00	2026-10-19 08:37:26.974994+00
zQ_86Rcj2	Paih	#3B8282	1225	915	2026-10-19 08:37:17.537873+00	2026-10-19 08:37:26.975226+00
fGBF5Yn3z	Server Admin	#3B8282	1225	915	2026-10-19 08:37:16.82343+00	2026-10-19 08:37:26.97501+00
EKtarJoCC	Paih	#3B8282	1225	915	2026-10-19 08:41:16.359561+00	2026-10-19 08:41:18.082788+00
waxWDGH7S	HEHE	#3B8282	1225	915	2026-10-20 02:03:08.184417+00	2026-10-20 02:03:14.672887+00
4K1aH5ez-	HEHE	#3B8282	1225	915	2026-10-19 09:08:12.224914+00	2026-10-19 09:08:28.515854+00
bn1SMIoal	Server Admin	#3B8282	1225	915	2026-10-19 09:08:11.695543+00	2026-10-19 09:08:28.566645+00
kSndeaZXQ	Paih	#3B8282	1225	915	2026-10-19 09:08:12.197403+00	2026-10-19 09:08:28.645159+00
dlT4GnRAN	HEHE	#3B8282	1225	915	2026-10-19 08:42:08.612258+00	2026-10-19 08:42:13.32171+00
ilT9cNl01	Server Admin	#3B8282	1225	915	2026-10-19 08:42:07.282178+00	2026-10-19 08:42:15.98551+00
iAqvy0FzF	Paih	#3B8282	1225	915	2026-10-19 08:42:08.506201+00	2026-10-19 08:42:16.57001+00
MTIuGekSc	HEHE	#3B8282	1225	915	2026-10-20 02:30:11.750752+00	2026-10-20 02:30:47.794114+00
s_xMtCDTp	Server Admin	#3B8282	1225	915	2026-10-19 10:11:41.02962+00	2026-10-19 10:11:45.125635+00
Zi7-o_QwI	HEHE	#3B8282	1225	915	2026-10-20 02:08:52.043939+00	2026-10-20 02:09:14.199639+00
RGHUCOyGl	Server Admin	#3B8282	758.9787608747249	417.6840730665704	2026-10-19 10:11:45.244893+00	2026-10-19 10:24:35.926664+00
FYQOqEZkj	HEHE	#3B8282	1001.5778918595903	454.1978918595904	2026-10-19 10:10:50.138195+00	2026-10-19 10:24:37.144645+00
bEwQkJmV2	Server Admin	#3B8282	1225	915	2026-10-19 08:21:23.752556+00	2026-10-19 08:22:07.591913+00
FuZaaqJq8	Paih	#3B8282	1225	915	2026-10-19 08:21:24.422302+00	2026-10-19 08:22:07.596962+00
bXL09dEaW	HEHE	#3B8282	1225	915	2026-10-19 08:21:24.129412+00	2026-10-19 08:22:07.691686+00
0Xiptc4Pd	Server Admin	#3B8282	1225	915	2026-10-20 02:03:14.748318+00	2026-10-20 02:04:15.205289+00
k9qIa5Wv0	Server Admin	#3B8282	1225	915	2026-10-19 10:25:53.371191+00	2026-10-19 10:26:15.356494+00
IrN3Dbw4M	HEHE	#3B8282	1225	915	2026-10-20 02:04:15.981484+00	2026-10-20 02:04:28.229577+00
Te4SvbZQe	HEHE	#3B8282	1225	915	2026-10-19 10:25:54.293032+00	2026-10-19 10:26:16.000521+00
-gXM9gjY4	Server Admin	#3B8282	1225	915	2026-10-20 02:04:28.33068+00	2026-10-20 02:04:34.4657+00
mIBWT-GjV	HEHE	#3B8282	1225	915	2026-10-19 10:26:17.606479+00	2026-10-19 10:26:28.790117+00
iWz-5y5lX	HEHE	#3B8282	1225	915	2026-10-20 02:04:35.384731+00	2026-10-20 02:04:44.451589+00
UjBhGGyrx	Server Admin	#3B8282	1225	915	2026-10-19 10:26:28.262967+00	2026-10-19 10:26:37.137209+00
RybnXYfTh	HEHE	#3B8282	1225	915	2026-10-19 10:26:29.461581+00	2026-10-19 10:26:37.77201+00
SdFk9HV_Q	Server Admin	#3B8282	1203.186515933549	630	2026-10-19 09:20:18.327686+00	2026-10-19 10:00:58.582927+00
4wQs1-Xqb	firdausfadzi	#3B8282	1056.1950563258656	805.7025844887982	2026-10-19 09:20:34.180962+00	2026-10-19 10:01:10.785326+00
D1YKCioBY	Server Admin	#3B8282	1225	915	2026-10-20 02:04:44.571547+00	2026-10-20 02:05:07.236209+00
Di12LUZtP	HEHE	#3B8282	1225	915	2026-10-20 02:04:45.134744+00	2026-10-20 02:05:07.716361+00
sTC8WoA20	Paih	#3B8282	1225	875.48	2026-10-19 10:01:56.448827+00	2026-10-19 10:02:05.046954+00
cMpEBEMhR	Server Admin	#3B8282	1225	915	2026-10-19 10:01:55.711125+00	2026-10-19 10:02:05.608223+00
WUZtZdyUp	HEHE	#3B8282	1225	915	2026-10-19 10:01:57.108792+00	2026-10-19 10:02:06.866753+00
cc2zamDCA	Server Admin	#3B8282	1225	915	2026-10-20 02:05:07.481186+00	2026-10-20 02:05:15.507888+00
ah-hU8Kf0	HEHE	#3B8282	1225	915	2026-10-20 02:05:08.449628+00	2026-10-20 02:05:15.896477+00
oE9iJ2l3R	Server Admin	#3B8282	1225	915	2026-10-20 02:05:15.738487+00	2026-10-20 02:05:34.370308+00
N2SxJyWMr	HEHE	#3B8282	1225	915	2026-10-20 02:05:16.820031+00	2026-10-20 02:05:34.62824+00
ElUY7CnIA	Server Admin	#3B8282	1225	915	2026-10-20 02:05:34.625072+00	2026-10-20 02:05:40.118629+00
py-URTlt_	HEHE	#3B8282	1225	915	2026-10-20 02:05:35.145375+00	2026-10-20 02:05:40.173192+00
zI43rv2iZ	Server Admin	#3B8282	1225	915	2026-10-20 02:05:40.377266+00	2026-10-20 02:05:48.581641+00
wgRmqA9UO	HEHE	#3B8282	1225	915	2026-10-20 02:05:40.674447+00	2026-10-20 02:05:48.632418+00
mD_n1Ixjv	Server Admin	#3B8282	1225	915	2026-10-20 02:05:48.845434+00	2026-10-20 02:06:14.696978+00
sOMkpqvpk	HEHE	#3B8282	1225	915	2026-10-20 02:05:49.195288+00	2026-10-20 02:06:14.897347+00
2jSIXvRRO	Server Admin	#3B8282	1225	915	2026-10-20 02:06:14.926021+00	2026-10-20 02:06:21.14615+00
URfKtHykQ	HEHE	#3B8282	1225	915	2026-10-20 02:06:15.456325+00	2026-10-20 02:06:21.215013+00
0uSPSyVAX	Server Admin	#3B8282	1225	915	2026-10-20 02:06:21.409936+00	2026-10-20 02:06:34.761382+00
MPJy5_Ow8	HEHE	#3B8282	1225	915	2026-10-20 02:06:21.745897+00	2026-10-20 02:06:34.966692+00
HwytdaTVl	Server Admin	#3B8282	1179.7275281629327	895.7275281629327	2026-10-20 03:37:25.715355+00	2026-10-20 03:37:39.123229+00
2dTLIOKsr	Server Admin	#3B8282	1225	915	2026-10-20 07:52:52.668223+00	2026-10-20 07:52:52.668223+00
vMmGBn04L	Server Admin	#3B8282	1225	915	2026-10-20 02:08:51.4086+00	2026-10-20 02:09:13.966969+00
uJM4jQVX6	HEHE	#3B8282	1225	915	2026-10-20 02:06:35.538967+00	2026-10-20 02:07:05.551805+00
XZ-MkxSSM	Server Admin	#3B8282	425	1315	2026-10-20 08:59:19.198555+00	2026-10-20 08:59:19.198555+00
mRyhFAXyr	HEHE	#3B8282	1225	915	2026-10-20 08:11:25.205603+00	2026-10-20 08:11:38.910098+00
wV72PEDmU	Server Admin	#3B8282	1225	915	2026-10-20 07:53:30.255807+00	2026-10-20 07:53:52.056955+00
Sw1gH4YJr	Server Admin	#3B8282	1225	915	2026-10-20 02:09:48.713103+00	2026-10-20 02:10:00.636125+00
wSmwLbpEd	HEHE	#3B8282	1225	915	2026-10-20 02:09:49.17852+00	2026-10-20 02:10:02.081736+00
WhYxGUoIq	Server Admin	#3B8282	1225	915	2026-10-20 06:31:12.845575+00	2026-10-20 06:31:13.324837+00
5ojFCjewI	HEHE	#3B8282	1225	915	2026-10-20 02:10:02.819458+00	2026-10-20 02:10:03.969022+00
Lt_NYUzLb	Server Admin	#3B8282	1225	915	2026-10-20 02:10:00.816317+00	2026-10-20 02:10:03.969016+00
alIYVb45x	HEHE	#3B8282	1225	915	2026-10-20 07:53:52.301805+00	2026-10-20 07:53:55.794321+00
kUDoXipHw	HEHE	#3B8282	1225	915	2026-10-20 08:15:03.023154+00	2026-10-20 08:15:05.763617+00
l6kdLtrUU	Server Admin	#3B8282	1123.577808177948	726.6625844887982	2026-10-20 02:28:05.114535+00	2026-10-20 02:30:09.791337+00
5TrXP0KZl	HEHE	#3B8282	1089.1123881554252	667.2799163183579	2026-10-20 02:25:42.072564+00	2026-10-20 02:30:09.947721+00
KPwhOwKJn	Server Admin	#3B8282	1225	915	2026-10-20 08:15:03.30941+00	2026-10-20 08:15:05.763642+00
mn70r80q2	HEHE	#3B8282	1225	915	2026-10-20 07:53:56.511459+00	2026-10-20 07:53:58.649269+00
DjL0zcqKA	Server Admin	#3B8282	916.1142693999432	366.2625249561909	2026-10-20 03:37:39.834774+00	2026-10-20 03:45:53.771806+00
a-e9adi4J	Server Admin	#3B8282	1225	915	2026-10-20 07:53:59.264913+00	2026-10-20 07:54:06.070997+00
J39R2T9K3	Server Admin	#3B8282	1225	915	2026-10-20 08:15:58.157702+00	2026-10-20 08:16:08.055943+00
09fIzhRer	HEHE	#3B8282	1225	915	2026-10-20 02:13:59.463788+00	2026-10-20 02:14:57.752651+00
HivXft61E	Server Admin	#3B8282	1225	915	2026-10-20 02:30:10.117692+00	2026-10-20 02:30:46.732321+00
GZr4sLSCP	Server Admin	#3B8282	1225	915	2026-10-20 07:56:55.433164+00	2026-10-20 07:56:56.740009+00
THiwMumR1	HEHE	#3B8282	1225	915	2026-10-20 02:34:45.239909+00	2026-10-20 02:34:46.861489+00
K2W04Vikv	HEHE	#3B8282	1225	915	2026-10-20 02:14:58.397118+00	2026-10-20 02:15:08.731277+00
rgvczhg1E	HEHE	#3B8282	1225	915	2026-10-20 02:15:09.39821+00	2026-10-20 02:15:24.053878+00
mDKhwDRr6	HEHE	#3B8282	1225	915	2026-10-20 08:16:09.23474+00	2026-10-20 08:16:16.396621+00
kUktzNiyi	Server Admin	#3B8282	1225	915	2026-10-20 02:41:32.429831+00	2026-10-20 02:41:37.717887+00
puQjSUB8J	Server Admin	#3B8282	908.5580334814097	318.16752816293285	2026-10-20 04:18:12.687651+00	2026-10-20 04:22:37.032288+00
9F0PlgN_A	Server Admin	#3B8282	1225	915	2026-10-20 02:25:11.363101+00	2026-10-20 02:25:31.376609+00
jegr4YMfT	Server Admin	#3B8282	1095.7637640814664	733.5037640814664	2026-10-20 02:38:37.590533+00	2026-10-20 02:41:39.219771+00
5MUr_9Lz5	HEHE	#3B8282	1225	915	2026-10-20 02:41:37.95899+00	2026-10-20 02:41:45.061081+00
dY9o1XOnf	Server Admin	#3B8282	956.8581171630527	303.3981171630523	2026-10-20 04:06:49.728254+00	2026-10-20 04:07:48.421072+00
cP8yyGCB-	HEHE	#3B8282	1225	915	2026-10-20 02:34:48.089682+00	2026-10-20 02:35:25.632928+00
dKcxnuaVk	HEHE	#3B8282	1225	915	2026-10-20 02:41:45.69792+00	2026-10-20 02:41:45.770212+00
AwYt0CyEI	HEHE	#3B8282	1086.1058802715543	672.7238397134304	2026-10-20 03:27:17.46068+00	2026-10-20 03:34:03.79064+00
dF96SOHee	Server Admin	#3B8282	1225	915	2026-10-20 02:35:24.419175+00	2026-10-20 02:35:30.708642+00
h_9RpPsh0	HEHE	#3B8282	1225	915	2026-10-20 02:35:26.224508+00	2026-10-20 02:35:30.738861+00
2NhWS2EcY	Server Admin	#3B8282	1225	915	2026-10-20 04:13:57.32804+00	2026-10-20 04:13:59.800664+00
-M74Ca0if	HEHE	#3B8282	1225	915	2026-10-20 02:35:31.364654+00	2026-10-20 02:35:35.790009+00
iUgpwzYaZ	Server Admin	#3B8282	1225	915	2026-10-20 02:55:24.356947+00	2026-10-20 03:02:19.595854+00
dl5yzZjxr	HEHE	#3B8282	1225	915	2026-10-20 02:35:36.372124+00	2026-10-20 02:35:40.929067+00
zGSyRrc-J	Server Admin	#3B8282	1225	915	2026-10-20 04:22:56.177929+00	2026-10-20 04:23:06.450696+00
2SwWY33q1	HEHE	#3B8282	1225	915	2026-10-20 02:35:53.344502+00	2026-10-20 02:35:58.73101+00
9xlBsJDWQ	Server Admin	#3B8282	1225	915	2026-10-20 04:14:39.433228+00	2026-10-20 04:14:44.322245+00
5akBe2lOi	HEHE	#3B8282	1225	915	2026-10-20 03:02:14.009445+00	2026-10-20 03:02:34.788771+00
kT4zdP-fi	Server Admin	#3B8282	1225	915	2026-10-20 02:35:58.8664+00	2026-10-20 02:36:04.717069+00
AFSWodpWD	Server Admin	#3B8282	1225	915	2026-10-20 04:23:19.375821+00	2026-10-20 04:23:22.057704+00
CwHUTp1DN	HEHE	#3B8282	1225	915	2026-10-20 02:36:05.027529+00	2026-10-20 02:36:09.930177+00
-wSBmkkbR	Server Admin	#3B8282	1225	915	2026-10-20 08:16:16.198744+00	2026-10-20 08:16:37.053883+00
rmLMUkkXM	Server Admin	#3B8282	1225	915	2026-10-20 02:38:33.703175+00	2026-10-20 02:38:37.321134+00
wpLCCw6RI	Player_wpLC	#3b82f6	1225	915	2026-10-20 03:22:06.775926+00	2026-10-20 03:22:17.987381+00
Y6j1icAby	Server Admin	#3B8282	1225	915	2026-10-20 04:14:59.601834+00	2026-10-20 04:15:08.663919+00
Tr7M8o1sz	HEHE	#3B8282	1225	915	2026-10-20 08:16:37.392109+00	2026-10-20 08:16:39.632415+00
VqidwXACB	Server Admin	#3B8282	1029.385980052554	719.3859800525536	2026-10-20 04:15:09.838672+00	2026-10-20 04:15:20.118461+00
QbbJPe0kl	Server Admin	#3B8282	1137.1739604148393	721.0939604148393	2026-10-20 02:46:53.023844+00	2026-10-20 02:55:23.685312+00
HvM761gWn	HEHE	#3B8282	1225	915	2026-10-20 08:16:40.281187+00	2026-10-20 08:16:45.784925+00
kgOrS4X8C	Server Admin	#3B8282	951.3656453259857	350.6856453259852	2026-10-20 04:15:34.235174+00	2026-10-20 04:15:48.267689+00
uhWnw5Gcj	Server Admin	#3B8282	1225	915	2026-10-20 08:16:46.164017+00	2026-10-20 08:17:07.059777+00
FUaZ1PfE0	Server Admin	#3B8282	1225	915	2026-10-20 04:23:48.307595+00	2026-10-20 04:24:50.332778+00
gfEsbDUMf	Server Admin	#3B8282	1225	915	2026-10-20 04:25:56.668246+00	2026-10-20 04:26:01.042518+00
M42QHPhIG	Server Admin	#3B8282	1225	915	2026-10-20 04:15:52.392034+00	2026-10-20 04:16:42.917226+00
z-m1P07_x	Server Admin	#3B8282	1086.0513759260411	694.7893514672736	2026-10-20 02:44:06.644226+00	2026-10-20 02:46:52.675748+00
5BZYIrOCY	Server Admin	#3B8282	1225	915	2026-10-20 04:26:55.683012+00	2026-10-20 04:27:03.662284+00
K-9UVsF_Z	HEHE	#3B8282	1225	915	2026-10-20 08:17:08.063964+00	2026-10-20 08:17:17.456963+00
lyZg-Lk7s	Server Admin	#3B8282	1225	915	2026-10-20 04:16:44.059719+00	2026-10-20 04:16:52.269163+00
-wH4LokCK	Server Admin	#3B8282	1225	915	2026-10-20 04:17:17.018745+00	2026-10-20 04:17:21.190013+00
o709xcg7N	HEHE	#3B8282	1152.779916318358	336.40598005255356	2026-10-20 03:34:06.587512+00	2026-10-20 03:36:56.797818+00
JH7cOQZOY	Server Admin	#3B8282	1050.6204763483881	1049.599523651612	2026-10-20 08:17:17.16548+00	2026-10-20 08:17:28.12168+00
ghSSpVa3p	HEHE	#3B8282	1178.1188204073317	458.8788204073319	2026-10-20 03:36:58.830618+00	2026-10-20 03:37:09.743318+00
WM3a98Vn1	Server Admin	#3B8282	1225	915	2026-10-20 08:17:28.345651+00	2026-10-20 08:17:36.789645+00
Jo_tIZD_Q	Server Admin	#3B8282	1225	915	2026-10-20 04:27:14.372269+00	2026-10-20 04:27:49.535442+00
Xx27Nf6sI	Server Admin	#3B8282	815.0698262232324	1534.1641325991773	2026-10-20 07:57:01.280673+00	2026-10-20 07:59:45.685075+00
BQ8vEHjJE	Server Admin	#3B8282	1225	915	2026-10-20 04:27:51.114026+00	2026-10-20 04:27:56.945056+00
ZRW83N4xe	Server Admin	#3B8282	1225	915	2026-10-20 08:17:36.927215+00	2026-10-20 08:17:44.045666+00
y3ujsrBCv	Server Admin	#3B8282	1225	915	2026-10-20 04:28:06.964431+00	2026-10-20 04:28:15.50532+00
vJsRLJ1qz	Server Admin	#3B8282	1225	915	2026-10-20 04:28:17.254588+00	2026-10-20 04:28:33.444533+00
9qHz0gGDP	Server Admin	#3B8282	624.22	1580	2026-10-20 08:20:13.938525+00	2026-10-20 08:20:30.693095+00
-lgnGtA6U	Server Admin	#3B8282	1183.9028355337246	490.9228355337249	2026-10-20 03:43:25.519439+00	2026-10-20 03:43:48.836974+00
EJejJm-uP	Server Admin	#3B8282	1225	915	2026-10-20 08:21:34.157492+00	2026-10-20 08:21:45.059525+00
RdBcEo-S2	HEHE	#3B8282	1225	915	2026-10-20 08:21:45.30146+00	2026-10-20 08:21:57.331177+00
XjG4Wpa2R	Server Admin	#3B8282	1225	915	2026-10-20 04:28:40.865608+00	2026-10-20 04:29:57.040176+00
AWm7tcCOU	Server Admin	#3B8282	1225	915	2026-10-20 04:30:07.29575+00	2026-10-20 04:30:07.851501+00
BXruqkfUN	Server Admin	#3B8282	1225	915	2026-10-20 04:30:09.667692+00	2026-10-20 04:30:49.567278+00
wjpZemDV_	Server Admin	#3B8282	1225	915	2026-10-20 04:31:12.93337+00	2026-10-20 04:31:22.412368+00
iVRavttE0	Server Admin	#3B8282	957.1652526592381	515.7652526592381	2026-10-20 05:20:20.021261+00	2026-10-20 05:21:11.502704+00
BeCZ3ZF8o	Server Admin	#3B8282	1225	915	2026-10-20 06:16:58.420007+00	2026-10-20 06:17:03.472321+00
U1c6X93-K	HEHE	#3B8282	1225	915	2026-10-20 02:41:32.628814+00	2026-10-20 02:41:37.582446+00
IOHpnrZL0	Server Admin	#3B8282	1225	915	2026-10-20 02:08:34.947923+00	2026-10-20 02:08:44.043976+00
oYtKW-QLU	HEHE	#3B8282	1225	915	2026-10-20 02:08:35.482791+00	2026-10-20 02:08:44.087854+00
m7xrZa8t6	Server Admin	#3B8282	1225	915	2026-10-20 07:53:03.39957+00	2026-10-20 07:53:06.04691+00
QOyG3ye1c	HEHE	#3B8282	1174.5652526592387	476.46047634838857	2026-10-20 03:37:11.267031+00	2026-10-20 03:37:44.412245+00
g3KL9B3Uo	Server Admin	#3B8282	1225	915	2026-10-20 02:41:37.999726+00	2026-10-20 02:41:45.714558+00
21tOMSVur	Server Admin	#3B8282	1225	915	2026-10-20 02:30:46.897419+00	2026-10-20 02:30:56.107659+00
7BBStB2J7	HEHE	#3B8282	1225	915	2026-10-20 02:30:48.522297+00	2026-10-20 02:30:56.879285+00
EPCylEXAZ	Server Admin	#3B8282	1225	915	2026-10-20 02:09:14.138589+00	2026-10-20 02:09:25.962328+00
lyW8H0G_N	HEHE	#3B8282	1225	915	2026-10-20 02:09:14.750128+00	2026-10-20 02:09:26.063813+00
TvZW2-2oh	Server Admin	#3B8282	1225	915	2026-10-20 02:41:45.867063+00	2026-10-20 02:41:45.867063+00
nZ4FqN-f6	Server Admin	#3B8282	1225	915	2026-10-20 04:23:07.224593+00	2026-10-20 04:23:18.462917+00
PB5HxSzct	Server Admin	#3B8282	1225	915	2026-10-20 02:09:26.141636+00	2026-10-20 02:09:32.709895+00
aUoyZDfbZ	HEHE	#3B8282	1225	915	2026-10-20 02:09:26.589635+00	2026-10-20 02:09:32.758432+00
1Wuq5hJDM	Server Admin	#3B8282	1225	915	2026-10-20 04:23:22.932155+00	2026-10-20 04:23:22.932155+00
9s46F4E5c	Server Admin	#3B8282	25	1365	2026-10-26 13:03:55.936981+00	2026-10-26 13:03:55.936981+00
dutCJKQn0	Server Admin	#3B8282	1225	915	2026-10-20 02:30:56.272389+00	2026-10-20 02:31:09.497672+00
_J4dunDcs	Server Admin	#3B8282	1225	915	2026-10-20 02:09:32.889275+00	2026-10-20 02:09:42.184351+00
R1EBQR4YV	HEHE	#3B8282	1225	915	2026-10-20 02:09:33.30657+00	2026-10-20 02:09:42.233959+00
xT0OeTuSg	HEHE	#3B8282	1225	915	2026-10-20 02:30:57.488476+00	2026-10-20 02:31:09.757021+00
vww4hIOfv	Server Admin	#3B8282	1225	915	2026-10-20 07:53:06.247265+00	2026-10-20 07:53:12.058776+00
xpLXSjYTX	Server Admin	#3B8282	1225	915	2026-10-20 02:09:42.381365+00	2026-10-20 02:09:48.534055+00
drcTKws89	HEHE	#3B8282	1225	915	2026-10-20 02:09:42.83275+00	2026-10-20 02:09:48.578523+00
W6mR-0hZR	HEHE	#3B8282	1344.4166301777088	1041.783765673896	2026-10-20 03:37:45.122722+00	2026-10-20 03:37:57.818821+00
jix13tRe3	Server Admin	#3B8282	1225	915	2026-10-20 02:31:09.65767+00	2026-10-20 02:31:14.231883+00
vS-QZEsoU	HEHE	#3B8282	1225	915	2026-10-20 02:31:10.338079+00	2026-10-20 02:31:14.722816+00
s9vXribPG	Server Admin	#3B8282	1225	915	2026-10-20 04:24:52.927183+00	2026-10-20 04:25:05.915593+00
sPrDE7O9o	HEHE	#3B8282	1225	915	2026-10-20 07:53:12.033921+00	2026-10-20 07:53:17.21324+00
TSEFJdLyz	Server Admin	#3B8282	1225	915	2026-10-20 02:06:35.027003+00	2026-10-20 02:08:15.618252+00
pDcXHt39c	HEHE	#3B8282	1225	915	2026-10-20 02:07:06.092838+00	2026-10-20 02:08:15.740886+00
avvjWAHDF	Server Admin	#3B8282	1225	915	2026-10-20 04:26:47.002733+00	2026-10-20 04:26:53.663528+00
yRCxh7Pbs	Server Admin	#3B8282	1225	915	2026-10-20 04:27:05.70777+00	2026-10-20 04:27:06.624139+00
hoPJdYDUp	HEHE	#3B8282	1225	915	2026-10-20 07:53:17.755497+00	2026-10-20 07:53:19.611427+00
mxJSFA1qW	Server Admin	#3B8282	1225	915	2026-10-20 02:08:15.784505+00	2026-10-20 02:08:21.872089+00
8ouIPLz-2	HEHE	#3B8282	1225	915	2026-10-20 02:08:16.33992+00	2026-10-20 02:08:21.945228+00
hBXrGj73E	Server Admin	#3B8282	1225	915	2026-10-20 04:27:08.294291+00	2026-10-20 04:27:12.784134+00
SUYFQjWJ1	HEHE	#3B8282	1225	915	2026-10-20 07:53:20.135734+00	2026-10-20 07:53:22.118942+00
E7nRasgsY	Server Admin	#3B8282	1225	915	2026-10-20 02:08:22.081008+00	2026-10-20 02:08:27.723222+00
P6LOtgeli	HEHE	#3B8282	1225	915	2026-10-20 02:08:22.902119+00	2026-10-20 02:08:27.797806+00
vi8HXNrcd	Server Admin	#3B8282	1225	915	2026-10-20 04:27:59.289882+00	2026-10-20 04:28:05.052474+00
KOdonZE9w	Server Admin	#3B8282	1225	915	2026-10-20 04:28:35.020024+00	2026-10-20 04:28:38.978501+00
c6C-rqTmS	Server Admin	#3B8282	1225	915	2026-10-20 02:08:27.901887+00	2026-10-20 02:08:34.788387+00
cncBJAq0x	HEHE	#3B8282	1225	915	2026-10-20 02:08:28.614608+00	2026-10-20 02:08:34.859967+00
WhwDKsHUl	Server Admin	#3B8282	1225	915	2026-10-20 04:29:58.994381+00	2026-10-20 04:29:59.997651+00
FP4hF_xuH	Server Admin	#3B8282	1225	915	2026-10-20 07:53:23.22519+00	2026-10-20 07:53:30.072837+00
w8v9l11kk	Server Admin	#3B8282	1225	915	2026-10-20 04:30:02.205361+00	2026-10-20 04:30:05.026976+00
tSn6n5r5x	Server Admin	#3B8282	1126.2121371104993	708.582417125514	2026-10-20 02:13:23.807919+00	2026-10-20 02:14:57.733434+00
P3iLVyHb_	Paih	#3B8282	1006.4641567482126	354.7507901545465	2026-10-20 03:43:57.284475+00	2026-10-20 03:45:53.771823+00
be-qhbJxd	Server Admin	#3B8282	1225	915	2026-10-20 02:14:57.840384+00	2026-10-20 02:15:08.719224+00
8uhqPOXMY	HEHE	#3B8282	1225	915	2026-10-20 02:44:20.826773+00	2026-10-20 03:02:19.595854+00
ty7Srq-Cb	HEHE	#3B8282	1075.1640730665704	483.291601229503	2026-10-20 03:37:58.432507+00	2026-10-20 03:45:53.771824+00
sfA7HcNzA	Player_sfA7	#3b82f6	1225	915	2026-10-20 03:21:24.179205+00	2026-10-20 03:21:24.34706+00
IyQvv6LDb	Server Admin	#3B8282	1225	915	2026-10-20 02:15:08.821087+00	2026-10-20 02:15:24.053721+00
YY1Iku8WM	HEHE	#3B8282	1225	915	2026-10-20 02:17:49.005075+00	2026-10-20 02:18:03.497046+00
m1gZC9pUq	Server Admin	#3B8282	891.3814885777721	327	2026-10-20 04:31:52.466538+00	2026-10-20 04:33:12.479354+00
Pdkc9wgLT	abbeyonde	#3B8282	1013.7926392003517	614.7974155112021	2026-10-20 03:36:20.780164+00	2026-10-20 03:39:40.306628+00
8e-VeQ_9P	Server Admin	#3B8282	1225	915	2026-10-20 02:25:31.643296+00	2026-10-20 02:28:04.532101+00
w8Er5i_JG	Server Admin	#3B8282	1225	915	2026-10-20 02:31:14.392076+00	2026-10-20 02:34:39.806158+00
qRbva7Z3O	HEHE	#3B8282	1225	915	2026-10-20 02:31:15.261878+00	2026-10-20 02:34:41.189774+00
wmdiXx1cW	Server Admin	#3B8282	1225	915	2026-10-20 02:34:39.975352+00	2026-10-20 02:34:42.218741+00
s-XrUqZPu	HEHE	#3B8282	1225	915	2026-10-20 02:34:42.214442+00	2026-10-20 02:34:42.959333+00
vryN9dYL2	Server Admin	#3B8282	1225	915	2026-10-20 02:34:42.382263+00	2026-10-20 02:34:46.055223+00
Y18kukC9T	Server Admin	#3B8282	913.0319938962494	344.1044657333169	2026-10-20 04:07:49.547024+00	2026-10-20 04:13:34.555152+00
RQGNiIbiV	Server Admin	#3B8282	1225	915	2026-10-20 02:34:46.2188+00	2026-10-20 02:35:24.260631+00
hYuS0qh4x	Server Admin	#3B8282	1225	915	2026-10-20 02:35:30.881148+00	2026-10-20 02:35:35.709852+00
84mnefxW7	Server Admin	#3B8282	1225	915	2026-10-20 02:35:35.862362+00	2026-10-20 02:35:40.92906+00
_deWV3ol-	Server Admin	#3B8282	1225	915	2026-10-20 02:35:52.882664+00	2026-10-20 02:35:58.714391+00
mfFyjXavj	Server Admin	#3B8282	942.8941277781237	530.2065996151908	2026-10-20 06:11:55.48502+00	2026-10-20 06:16:50.845207+00
ztu9QENGB	HEHE	#3B8282	1225	915	2026-10-20 02:35:59.171358+00	2026-10-20 02:36:04.731705+00
0ugI31OxZ	abbeyonde	#3B8282	1088.759071452258	216.433735111378	2026-10-20 03:30:51.853859+00	2026-10-20 03:36:10.157277+00
miX2uIqZ2	Server Admin	#3B8282	1225	915	2026-10-20 02:36:04.866818+00	2026-10-20 02:36:09.93019+00
3d2BPWdzK	Server Admin	#3B8282	1127.6138767331977	765.0938767331974	2026-10-20 02:37:46.31401+00	2026-10-20 02:37:50.449097+00
TE3P3V6uW	Server Admin	#3B8282	1225	915	2026-10-20 06:18:43.493041+00	2026-10-20 06:18:48.56857+00
tPcSgCUtd	abbeyonde	#3B8282	1225	915	2026-10-20 03:36:11.569761+00	2026-10-20 03:36:15.057566+00
qO3MIyxI-	Server Admin	#3B8282	992.570505318478	564.0105053184774	2026-10-20 04:14:01.111443+00	2026-10-20 04:14:38.122582+00
GrcWU9pR6	Server Admin	#3B8282	1225	915	2026-10-20 04:14:45.47284+00	2026-10-20 04:14:53.174293+00
jgp6lKq2g	Server Admin	#3B8282	1225	915	2026-10-20 04:14:54.483097+00	2026-10-20 04:14:58.391141+00
APQdjxEIF	Server Admin	#3B8282	1111.8331992303822	703.5207273933149	2026-10-20 02:37:50.720581+00	2026-10-20 02:38:33.450529+00
YUei-4Qe6	Server Admin	#3B8282	1225	915	2026-10-20 04:15:21.302967+00	2026-10-20 04:15:33.063664+00
NwFnPF3rk	Server Admin	#3B8282	1225	915	2026-10-20 04:15:49.468848+00	2026-10-20 04:15:51.224007+00
Aa8-_PJkY	Server Admin	#3B8282	1225	915	2026-10-20 04:16:53.42949+00	2026-10-20 04:16:58.338804+00
hBeD9SuNx	Server Admin	#3B8282	1225	915	2026-10-20 04:16:59.502727+00	2026-10-20 04:17:03.005188+00
Gtun12ZuR	Server Admin	#3B8282	1225	915	2026-10-20 04:17:04.190986+00	2026-10-20 04:17:15.614347+00
sxxMRdMlL	Server Admin	#3B8282	1225	915	2026-10-20 04:18:10.173769+00	2026-10-20 04:18:10.475971+00
c86Iyx_fW	Server Admin	#3B8282	1034.7636466086822	410.25100740833005	2026-10-20 03:25:14.122559+00	2026-10-20 03:37:17.964027+00
uq4yXhTPK	Server Admin	#3B8282	1048.322299652729	461.4222996527292	2026-10-20 03:37:19.934758+00	2026-10-20 03:37:25.167208+00
olzuKBshj	HEHE	#3B8282	588.5837640814664	1680	2026-10-20 08:57:35.456389+00	2026-10-20 08:57:44.181702+00
icLlhWhho	HEHE	#3B8282	1225	915	2026-10-20 07:53:03.655793+00	2026-10-20 07:53:05.863771+00
_SOcSJ7et	Paih	#3B8282	425	1315	2026-10-20 09:43:32.611576+00	2026-10-20 09:43:40.737263+00
MnwTwkdHr	HEHE	#3B8282	1225	915	2026-10-20 08:15:43.908869+00	2026-10-20 08:15:50.498102+00
BG4yicaSL	Server Admin	#3B8282	425	1315	2026-10-20 09:43:19.38724+00	2026-10-20 09:43:24.103374+00
QlHJdtD2T	HEHE	#3B8282	1225	915	2026-10-20 08:22:36.676967+00	2026-10-20 08:23:55.242338+00
ek_rqHkrd	HEHE	#3B8282	1225	915	2026-10-20 08:15:51.128693+00	2026-10-20 08:15:57.837855+00
5IrTw5EZg	HEHE	#3B8282	1225	915	2026-10-20 07:53:30.701947+00	2026-10-20 07:53:51.720106+00
JmdFSDYYr	HEHE	#3B8282	425	1315	2026-10-21 02:13:53.982148+00	2026-10-21 02:13:58.972681+00
mP3GHErN3	Server Admin	#3B8282	1225	915	2026-10-20 07:54:06.261298+00	2026-10-20 07:54:11.056566+00
pOUQTaTev	Server Admin	#3B8282	425	1315	2026-10-20 09:02:22.382497+00	2026-10-20 09:02:33.0897+00
p040AoPO6	HEHE	#3B8282	425	1315	2026-10-20 09:04:02.418398+00	2026-10-20 09:04:53.222913+00
ZNwwaL8gr	Server Admin	#3B8282	425	1315	2026-10-20 09:43:40.752391+00	2026-10-20 09:43:43.475756+00
4p9yDpGQj	HEHE	#3B8282	1225	915	2026-10-20 07:54:11.128685+00	2026-10-20 07:54:16.647917+00
8OKoyQfCP	HEHE	#3B8282	1225	915	2026-10-20 07:54:17.068909+00	2026-10-20 07:54:17.068909+00
CNrR2bjKR	Server Admin	#3B8282	425	1315	2026-10-20 09:02:33.250131+00	2026-10-20 09:02:43.052277+00
cxnP0nOUP	Server Admin	#3B8282	1122.1214048961301	785.6014048961299	2026-10-20 07:56:56.783873+00	2026-10-20 07:57:01.250375+00
a6Nuxpn54	HEHE	#3B8282	1225	915	2026-10-20 08:15:58.709587+00	2026-10-20 08:16:08.494163+00
QWR5T8hXj	HEHE	#3B8282	1225	915	2026-10-20 08:23:56.114796+00	2026-10-20 08:24:22.080127+00
JxIlYiEKT	Server Admin	#3B8282	1225	915	2026-10-20 08:16:08.303136+00	2026-10-20 08:16:16.067502+00
hDK5LseyP	HEHE	#3B8282	425	1315	2026-10-20 09:04:53.747938+00	2026-10-20 09:04:56.471309+00
S6e-Z_6NM	Server Admin	#3B8282	425	1315	2026-10-20 09:04:54.217842+00	2026-10-20 09:04:57.053678+00
Ih7RFJEWi	HEHE	#3B8282	425	1315	2026-10-20 09:02:43.388516+00	2026-10-20 09:02:51.303469+00
EFrb_x4nP	Server Admin	#3B8282	1225	915	2026-10-20 08:24:22.248695+00	2026-10-20 08:24:28.056341+00
A_095zH7D	HEHE	#3B8282	1225	915	2026-10-20 08:16:17.029824+00	2026-10-20 08:16:36.438609+00
n48l1S4ZO	nooogel	#3B8282	425	1315	2026-10-20 09:43:43.04781+00	2026-10-20 09:43:43.866701+00
f9eDOCjJy	HEHE	#3B8282	1225	915	2026-10-20 08:24:27.620276+00	2026-10-20 08:24:37.691493+00
ltsYUjvWU	Server Admin	#3B8282	1225	915	2026-10-20 08:17:44.193292+00	2026-10-20 08:17:53.113365+00
DP6ZIEeoM	Server Admin	#3B8282	1225	915	2026-10-20 08:24:38.19573+00	2026-10-20 08:24:41.039831+00
RJKb-bnyQ	Server Admin	#3B8282	425	1315	2026-10-20 09:04:57.172689+00	2026-10-20 09:05:05.081672+00
QOQasxGqe	HEHE	#3B8282	425	1315	2026-10-21 02:14:49.205332+00	2026-10-21 02:14:55.336967+00
z91abI4Le	HEHE	#3B8282	1225	915	2026-10-20 08:17:55.168349+00	2026-10-20 08:18:03.414804+00
A8F_DBf7L	Server Admin	#3B8282	425	1315	2026-10-20 09:05:05.196069+00	2026-10-20 09:05:10.049047+00
Xf8DRKZXd	HEHE	#3B8282	1225	915	2026-10-20 08:18:15.119557+00	2026-10-20 08:18:23.136586+00
dkBVrU7Id	Server Admin	#3B8282	1225	915	2026-10-20 08:24:41.190626+00	2026-10-20 08:24:57.069378+00
wcFiJC4G8	Server Admin	#3B8282	425	1315	2026-10-20 09:05:10.167773+00	2026-10-20 09:05:14.051778+00
zMBzt55oh	Server Admin	#3B8282	658.0668490676882	1618	2026-10-20 08:20:30.841531+00	2026-10-20 08:20:39.960895+00
CTl5cXZ2k	Server Admin	#3B8282	1225	915	2026-10-20 08:24:57.192203+00	2026-10-20 08:25:02.075721+00
H7FUk-wEw	Server Admin	#3B8282	1225	915	2026-10-20 08:25:02.172009+00	2026-10-20 08:25:06.046804+00
yyh2U7opA	Server Admin	#3B8282	1110.2101126517312	990.0098873482691	2026-10-20 08:20:40.113124+00	2026-10-20 08:20:55.072276+00
jmIXsCOch	Server Admin	#3B8282	1225	915	2026-10-20 08:25:30.243677+00	2026-10-20 08:25:30.243677+00
6dtjN8p0U	Server Admin	#3B8282	425	1315	2026-10-20 09:02:52.185197+00	2026-10-20 09:03:38.095044+00
ehIS6t4Jp	HEHE	#3B8282	425	1315	2026-10-20 09:05:14.129708+00	2026-10-20 09:05:19.038949+00
nk-Euhse-	HEHE	#3B8282	1225	915	2026-10-20 08:20:56.050685+00	2026-10-20 08:21:02.419741+00
jWATOGtGY	Server Admin	#3B8282	877.996009022642	1208.4439909773582	2026-10-20 08:29:20.197306+00	2026-10-20 08:29:31.761847+00
cmFzHQSdB	Server Admin	#3B8282	425	1315	2026-10-20 09:03:38.248493+00	2026-10-20 09:03:43.040464+00
1YQG_-f18	HEHE	#3B8282	425	1315	2026-10-20 09:03:41.887806+00	2026-10-20 09:03:44.455488+00
wSXAK_L7-	HEHE	#3B8282	425	1315	2026-10-20 09:03:44.876753+00	2026-10-20 09:03:47.758157+00
DuBVuzvGd	Server Admin	#3B8282	1225	915	2026-10-20 08:21:02.183344+00	2026-10-20 08:21:30.054411+00
t4DEaGAC2	Server Admin	#3B8282	425	1315	2026-10-20 09:05:23.176519+00	2026-10-20 09:05:36.083129+00
Bp7cRcZwI	HEHE	#3B8282	1225	915	2026-10-20 08:21:30.009459+00	2026-10-20 08:21:33.670779+00
Kc1bMDm5O	Server Admin	#3B8282	425	1315	2026-10-20 09:03:52.162297+00	2026-10-20 09:04:02.117981+00
dYTa3eQfO	HEHE	#3B8282	1225	915	2026-10-20 08:21:34.297507+00	2026-10-20 08:21:44.690108+00
CW6EzJ6M6	nooogel	#3B8282	425	1315	2026-10-20 09:43:45.094558+00	2026-10-20 09:44:06.153934+00
1mIWArgRf	Server Admin	#3B8282	425	1315	2026-10-20 09:05:36.219309+00	2026-10-20 09:05:48.065264+00
cvi-qZyyE	HEHE	#3B8282	425	1315	2026-10-20 09:43:45.965449+00	2026-10-20 09:44:06.958985+00
PTzaSXlBU	HEHE	#3B8282	425	1315	2026-10-20 09:05:48.072877+00	2026-10-20 09:05:53.52908+00
GFmY1tz7l	Server Admin	#3B8282	1225	915	2026-10-20 08:21:59.104535+00	2026-10-20 08:22:36.048772+00
rPJIzJch2	HEHE	#3B8282	425	1315	2026-10-20 09:05:54.015837+00	2026-10-20 09:06:14.797494+00
lkfDzspa5	Server Admin	#3B8282	425	1315	2026-10-20 09:44:12.574542+00	2026-10-20 09:44:35.616494+00
_l7cHU2h6	Paih	#3B8282	425	1315	2026-10-20 09:44:14.753036+00	2026-10-20 09:44:36.044054+00
r-bb_EyDQ	Server Admin	#3B8282	770.0537093699127	1468	2026-10-20 09:54:30.012275+00	2026-10-20 10:07:01.215972+00
Fkdod9tjl	Server Admin	#3B8282	425	1315	2026-10-20 09:06:15.201051+00	2026-10-20 09:07:06.215435+00
9V0YgsGYp	HEHE	#3B8282	425	1315	2026-10-20 09:07:06.306129+00	2026-10-20 09:07:14.906684+00
O_VGVxd_4	Server Admin	#3B8282	425	1315	2026-10-20 09:44:35.843852+00	2026-10-20 09:44:48.166788+00
bythpI7JV	HEHE	#3B8282	425	1315	2026-10-20 09:44:39.644241+00	2026-10-20 09:44:48.376086+00
keqwRuyp3	Server Admin	#3B8282	425	1315	2026-10-20 09:07:15.182866+00	2026-10-20 09:07:47.069198+00
32D7WQUbl	nooogel	#3B8282	425	1315	2026-10-20 09:44:37.186376+00	2026-10-20 09:44:49.103987+00
n3P1gJOL7	Paih	#3B8282	425	1315	2026-10-20 09:44:38.001792+00	2026-10-20 09:44:49.251265+00
k_WFulj3C	Server Admin	#3B8282	902.5455616443436	378.45786611812605	2026-10-20 06:29:27.637666+00	2026-10-20 07:51:20.168326+00
SnzT2VKyU	HEHE	#3B8282	425	1315	2026-10-20 09:07:47.968241+00	2026-10-20 09:08:02.800639+00
_4MKl_1Zg	Server Admin	#3B8282	425	1315	2026-10-20 09:07:47.232703+00	2026-10-20 09:08:03.085685+00
fvlPHnbYi	HEHE	#3B8282	425	1315	2026-10-20 09:08:03.512276+00	2026-10-20 09:08:16.105172+00
hAOuy-4zh	nooogel	#3B8282	1235.293484066451	818	2026-10-20 10:17:50.561966+00	2026-10-20 10:22:36.364562+00
yY75r2Yws	HEHE	#3B8282	425	1315	2026-10-20 09:08:16.668257+00	2026-10-20 09:09:50.519952+00
TLGAtOYT6	Server Admin	#3B8282	425	1315	2026-10-20 09:09:50.228603+00	2026-10-20 09:10:14.059961+00
-K3YA1Pm2	HEHE	#3B8282	425	1315	2026-10-20 09:10:15.123014+00	2026-10-20 09:10:21.456783+00
Y6d09Gvoq	HEHE	#3B8282	425	1315	2026-10-20 09:10:22.089055+00	2026-10-20 09:10:53.450218+00
r8tmGV4Oy	Server Admin	#3B8282	425	1315	2026-10-20 09:10:54.268238+00	2026-10-20 09:10:58.061781+00
YipM0zDto	Server Admin	#3B8282	425	1315	2026-10-20 09:10:58.199373+00	2026-10-20 09:11:03.057699+00
EvEKp4VLF	HEHE	#3B8282	425	1315	2026-10-20 09:11:02.856921+00	2026-10-20 09:11:08.536719+00
Fb_nqR0Dx	Server Admin	#3B8282	425	1315	2026-10-20 09:11:09.190021+00	2026-10-20 09:11:09.190021+00
4y5u8BFa5	Server Admin	#3B8282	425	1315	2026-10-20 09:11:36.214875+00	2026-10-20 09:11:40.060042+00
XPl3kSUiM	HEHE	#3B8282	425	1315	2026-10-20 09:11:37.2556+00	2026-10-20 09:11:40.526988+00
k9PMIixQD	HEHE	#3B8282	425	1315	2026-10-20 09:11:40.93922+00	2026-10-20 09:11:41.252625+00
mE6560AGL	Server Admin	#3B8282	425	1315	2026-10-20 09:11:40.162346+00	2026-10-20 09:11:41.252553+00
NvKPNA2F2	HEHE	#3B8282	425	1315	2026-10-20 09:24:40.21818+00	2026-10-20 09:24:53.493722+00
RrYneZdRZ	HEHE	#3B8282	654.6739266236943	1307.1035387780037	2026-10-20 10:06:24.572125+00	2026-10-20 10:32:46.177514+00
s_i0mLaAc	HEHE	#3B8282	1225	915	2026-10-20 07:53:06.529369+00	2026-10-20 07:53:11.466767+00
6WLw2EYct	Server Admin	#3B8282	1225	915	2026-10-20 08:22:36.15942+00	2026-10-20 08:23:56.074154+00
AkGB9xGEn	Server Admin	#3B8282	1225	915	2026-10-20 07:53:12.237341+00	2026-10-20 07:53:18.055239+00
0U-kn2i-J	Server Admin	#3B8282	425	1315	2026-10-20 09:04:02.232136+00	2026-10-20 09:04:54.083283+00
X1dBQ-1hK	Server Admin	#3B8282	1225	915	2026-10-20 07:53:18.233603+00	2026-10-20 07:53:20.039921+00
uWZN2bOYD	Server Admin	#3B8282	1225	915	2026-10-20 07:53:20.223953+00	2026-10-20 07:53:23.050261+00
3iNRxYtt_	HEHE	#3B8282	425	1315	2026-10-20 09:04:57.00946+00	2026-10-20 09:05:04.771747+00
eKYJ6TDIm	HEHE	#3B8282	1225	915	2026-10-20 07:53:22.777849+00	2026-10-20 07:53:29.97446+00
QT7AZsoay	Server Admin	#3B8282	1225	915	2026-10-20 08:23:56.191709+00	2026-10-20 08:24:22.080092+00
IqSLXA6I0	Server Admin	#3B8282	1225	915	2026-10-20 07:53:52.262491+00	2026-10-20 07:53:55.054357+00
Aao7G5xCV	HEHE	#3B8282	1225	915	2026-10-20 08:24:22.738807+00	2026-10-20 08:24:27.168062+00
6jHta0OnL	Server Admin	#3B8282	1225	915	2026-10-20 07:53:55.219584+00	2026-10-20 07:53:59.056434+00
-IaZTOCr5	HEHE	#3B8282	425	1315	2026-10-20 09:05:05.444089+00	2026-10-20 09:05:10.040898+00
kLJO6oJMZ	HEHE	#3B8282	1225	915	2026-10-20 07:53:59.118447+00	2026-10-20 07:54:05.807112+00
iNHuNB88Z	HEHE	#3B8282	425	1315	2026-10-20 09:05:10.512518+00	2026-10-20 09:05:13.619893+00
cqrp7nP28	HEHE	#3B8282	1225	915	2026-10-20 07:54:06.462019+00	2026-10-20 07:54:10.652049+00
mSenODBC9	Server Admin	#3B8282	1225	915	2026-10-20 08:24:28.152322+00	2026-10-20 08:24:38.05477+00
Yjtiv7pur	Server Admin	#3B8282	1225	915	2026-10-20 07:54:11.234987+00	2026-10-20 07:54:16.065663+00
u0wSWfzoL	HEHE	#3B8282	1225	915	2026-10-20 08:24:38.297731+00	2026-10-20 08:24:40.886849+00
e4V_1WfYJ	Server Admin	#3B8282	1225	915	2026-10-20 07:54:16.244753+00	2026-10-20 07:54:16.392523+00
wGTZp_6K1	Server Admin	#3B8282	425	1315	2026-10-20 09:05:14.166001+00	2026-10-20 09:05:19.048391+00
b3cZthKgy	HEHE	#3B8282	1225	915	2026-10-20 08:24:41.33715+00	2026-10-20 08:24:56.161319+00
xtywwEQGN	HEHE	#3B8282	1225	915	2026-10-20 08:24:57.003651+00	2026-10-20 08:25:01.357516+00
EsECZnYSm	HEHE	#3B8282	425	1315	2026-10-20 09:05:19.587543+00	2026-10-20 09:05:22.899314+00
QoCLpLpOM	HEHE	#3B8282	1225	915	2026-10-20 08:25:02.044039+00	2026-10-20 08:25:05.605616+00
i59Wsxxct	Server Admin	#3B8282	425	1315	2026-10-20 09:05:19.151211+00	2026-10-20 09:05:23.05433+00
5c3G2an7K	Server Admin	#3B8282	1225	915	2026-10-20 08:25:06.153422+00	2026-10-20 08:25:06.602304+00
o6NbkbJez	HEHE	#3B8282	1225	915	2026-10-20 08:25:06.084401+00	2026-10-20 08:25:06.602286+00
XNbarp35N	HEHE	#3B8282	1225	915	2026-10-20 08:25:30.999264+00	2026-10-20 08:25:30.999264+00
mL0Y8s0Oq	HEHE	#3B8282	425	1315	2026-10-20 09:05:23.583208+00	2026-10-20 09:05:35.683198+00
exAUBddyh	HEHE	#3B8282	425	1315	2026-10-20 09:05:36.25639+00	2026-10-20 09:05:47.478675+00
9yOzNdXLd	Server Admin	#3B8282	425	1315	2026-10-20 09:05:48.205738+00	2026-10-20 09:05:54.067279+00
kAlxxDST8	Server Admin	#3B8282	425	1315	2026-10-20 09:05:54.182674+00	2026-10-20 09:06:15.076414+00
6WFLiKvjc	Server Admin	#3B8282	625.8962359185336	1704.74	2026-10-20 07:59:45.876078+00	2026-10-20 08:15:03.071553+00
GNoJI30oa	Server Admin	#3B8282	1225	915	2026-10-20 08:15:44.183743+00	2026-10-20 08:15:51.055303+00
VkcwtAyw-	Server Admin	#3B8282	1225	915	2026-10-20 08:15:51.17159+00	2026-10-20 08:15:58.043949+00
iXoWIjgwb	Server Admin	#3B8282	1225	915	2026-10-20 08:16:37.192392+00	2026-10-20 08:16:40.047793+00
qdtj9BQga	HEHE	#3B8282	425	1315	2026-10-20 09:06:15.490411+00	2026-10-20 09:07:05.56097+00
mXrwZkO3c	Server Admin	#3B8282	1225	915	2026-10-20 08:16:40.174189+00	2026-10-20 08:16:46.051503+00
3hOby5GTa	Server Admin	#3B8282	425	1315	2026-10-20 09:07:06.343256+00	2026-10-20 09:07:15.054232+00
iWOHZVYPM	HEHE	#3B8282	1225	915	2026-10-20 08:16:46.423677+00	2026-10-20 08:17:07.443486+00
4IQHy2xdn	Server Admin	#3B8282	1225	915	2026-10-20 08:17:07.173035+00	2026-10-20 08:17:17.053583+00
rFO9zIVig	HEHE	#3B8282	425	1315	2026-10-20 09:07:15.486234+00	2026-10-20 09:07:47.301941+00
VFIUZc18K	HEHE	#3B8282	1225	915	2026-10-20 08:17:18.342635+00	2026-10-20 08:17:28.414668+00
XyREC5utS	Server Admin	#3B8282	425	1315	2026-10-20 09:08:03.188335+00	2026-10-20 09:08:16.064485+00
Urd9V7YTL	HEHE	#3B8282	1225	915	2026-10-20 08:17:29.276292+00	2026-10-20 08:17:37.452614+00
IS9N-XGei	HEHE	#3B8282	1225	915	2026-10-20 08:17:38.187891+00	2026-10-20 08:17:44.439915+00
fTDoNT_eq	HEHE	#3B8282	1225	915	2026-10-20 08:17:45.152114+00	2026-10-20 08:17:54.399987+00
BmtM5YY9n	Server Admin	#3B8282	1225	915	2026-10-20 08:17:53.259101+00	2026-10-20 08:18:02.384627+00
VIP3aP3xX	HEHE	#3B8282	944.1352816293273	350.0202253034621	2026-10-20 07:23:35.974763+00	2026-10-20 07:51:20.1683+00
AEP1QWkAj	Server Admin	#3B8282	1225	915	2026-10-20 08:18:02.524904+00	2026-10-20 08:18:14.081084+00
EmHa28DUS	HEHE	#3B8282	1225	915	2026-10-20 08:18:04.870996+00	2026-10-20 08:18:14.467273+00
km3T4lfXU	Server Admin	#3B8282	1225	915	2026-10-20 08:18:14.207568+00	2026-10-20 08:18:23.136599+00
uWFW9dtOD	HEHE	#3B8282	1225	915	2026-10-20 08:20:31.477993+00	2026-10-20 08:20:40.55234+00
BsMdwe8R9	Server Admin	#3B8282	425	1315	2026-10-20 09:08:16.194037+00	2026-10-20 09:09:50.086862+00
AFNX1RXQh	HEHE	#3B8282	1225	915	2026-10-20 08:20:41.286279+00	2026-10-20 08:20:55.416065+00
CD5gIfsP_	Server Admin	#3B8282	1225	915	2026-10-20 08:20:55.183954+00	2026-10-20 08:21:02.073693+00
Kmh5ZUlBP	HEHE	#3B8282	425	1315	2026-10-20 09:09:51.140097+00	2026-10-20 09:10:14.585302+00
9eZ6Jg_j0	Server Admin	#3B8282	425	1315	2026-10-20 09:10:14.179214+00	2026-10-20 09:10:21.098473+00
ZNAbrKkFy	HEHE	#3B8282	1225	915	2026-10-20 08:21:03.139028+00	2026-10-20 08:21:29.40206+00
tK91n-Sm0	Server Admin	#3B8282	1225	915	2026-10-20 08:21:30.20457+00	2026-10-20 08:21:34.0535+00
GLsER6w5x	Server Admin	#3B8282	1225	915	2026-10-20 08:21:45.162397+00	2026-10-20 08:21:58.979455+00
mdz-hrjXH	Server Admin	#3B8282	425	1315	2026-10-20 09:10:21.326597+00	2026-10-20 09:10:54.08373+00
ExbIMMg-t	HEHE	#3B8282	425	1315	2026-10-20 09:10:54.098696+00	2026-10-20 09:10:57.560773+00
RiX1RDYNK	HEHE	#3B8282	1225	915	2026-10-20 08:21:57.860841+00	2026-10-20 08:22:35.923994+00
6xY7wyjY0	HEHE	#3B8282	425	1315	2026-10-20 09:10:58.096632+00	2026-10-20 09:11:02.446844+00
OZP4Zvio_	Server Admin	#3B8282	425	1315	2026-10-20 09:11:03.162693+00	2026-10-20 09:11:09.070955+00
2DlfAnqgK	HEHE	#3B8282	425	1315	2026-10-20 09:11:09.100214+00	2026-10-20 09:11:09.100214+00
fXj9dh7Yh	Server Admin	#3B8282	622.6663984607649	1580	2026-10-20 08:29:31.90244+00	2026-10-20 08:57:44.181514+00
J9sOt7wFU	HEHE	#3B8282	911.74	1605.6486240739587	2026-10-20 08:57:50.828173+00	2026-10-20 08:59:15.355787+00
IwNNsMS2d	HEHE	#3B8282	425	1315	2026-10-20 08:59:16.545529+00	2026-10-20 08:59:18.608948+00
yDCYVLuQb	HEHE	#3B8282	425	1315	2026-10-20 08:59:18.948423+00	2026-10-20 08:59:18.948423+00
bFEfxfqA4	Server Admin	#3B8282	425	1315	2026-10-20 08:59:15.336634+00	2026-10-20 08:59:19.077211+00
xqNId_cwV	HEHE	#3B8282	425	1315	2026-10-20 09:02:22.73274+00	2026-10-20 09:02:32.610522+00
6uOUdkbto	HEHE	#3B8282	425	1315	2026-10-20 09:02:33.278992+00	2026-10-20 09:02:42.803755+00
-zqUyJWEi	Server Admin	#3B8282	425	1315	2026-10-20 09:02:43.210594+00	2026-10-20 09:02:52.063743+00
011f08TzN	HEHE	#3B8282	425	1315	2026-10-20 09:02:51.911625+00	2026-10-20 09:03:38.184252+00
myvyuzliy	HEHE	#3B8282	425	1315	2026-10-20 09:03:38.774141+00	2026-10-20 09:03:41.428131+00
N3C0CJ2AU	Server Admin	#3B8282	425	1315	2026-10-20 09:03:43.168853+00	2026-10-20 09:03:45.066436+00
7X-K_KIId	Server Admin	#3B8282	425	1315	2026-10-20 09:03:45.183249+00	2026-10-20 09:03:48.056313+00
IXuu-V3gT	HEHE	#3B8282	425	1315	2026-10-20 09:03:48.364938+00	2026-10-20 09:03:51.611897+00
Xv2ZOQeRv	Server Admin	#3B8282	425	1315	2026-10-20 09:03:48.187616+00	2026-10-20 09:03:52.056791+00
mjotm3tm2	HEHE	#3B8282	425	1315	2026-10-20 09:03:52.140973+00	2026-10-20 09:04:01.761537+00
_o52pN82E	Server Admin	#3B8282	425	1315	2026-10-20 09:43:30.388508+00	2026-10-20 09:43:40.5325+00
HsJr1NTs0	Server Admin	#3B8282	538.8790714522581	1122.6074943717906	2026-10-20 10:18:25.399034+00	2026-10-20 10:32:46.178166+00
ZazV8HdiE	Pro Gamer	#3B8282	425	1315	2026-10-21 02:14:17.922522+00	2026-10-21 02:14:17.922522+00
7cECe0ByV	Server Admin	#3B8282	75	1615	2026-10-22 06:23:44.281759+00	2026-10-22 06:23:44.908224+00
jh9cgDmWs	Pro Gamer	#3B8282	425	1315	2026-10-21 02:14:55.153334+00	2026-10-21 02:14:58.74924+00
ZqkdoEzio	Server Admin	#3B8282	534.1955342666835	1333.0572143567747	2026-10-20 10:07:01.477132+00	2026-10-20 10:18:12.792464+00
il7ygKXn7	Pro Gamer	#3B8282	425	1315	2026-10-21 02:14:58.885817+00	2026-10-21 02:15:03.750025+00
7xyNENeuj	Server Admin	#3B8282	425	1315	2026-10-20 09:43:43.621866+00	2026-10-20 09:44:05.757584+00
B2eFSvDJT	Paih	#3B8282	425	1315	2026-10-20 09:43:45.816407+00	2026-10-20 09:44:06.933527+00
XBLIYJF3X	Server Admin	#3B8282	1082.3258722218764	862.0445751564232	2026-10-20 10:18:12.858833+00	2026-10-20 10:18:25.349585+00
NLvFjhZ6L	HEHE	#3B8282	425	1315	2026-10-21 02:15:05.236646+00	2026-10-21 02:15:11.419093+00
uwhHhb0-8	nooogel	#3B8282	425	1315	2026-10-20 09:44:08.03665+00	2026-10-20 09:44:11.890043+00
U7we2SgNs	HEHE	#3B8282	425	1315	2026-10-20 09:44:10.201118+00	2026-10-20 09:44:13.753568+00
vonlaadfv	Server Admin	#3B8282	425	1315	2026-10-20 09:48:55.367541+00	2026-10-20 09:48:55.367541+00
G49fMb1-7	Paih	#3B8282	425	1315	2026-10-20 09:48:57.039219+00	2026-10-20 09:48:57.039219+00
zS0qjjbMk	Pro Gamer	#3B8282	425	1315	2026-10-21 02:23:19.704679+00	2026-10-21 02:23:42.533649+00
Dsd-wnvNx	nooogel	#3B8282	1236	918	2026-10-21 04:02:39.868334+00	2026-10-21 04:02:56.219947+00
NMuCptBbk	HEHE	#3B8282	638	1584.7345799774769	2026-10-20 10:00:58.448716+00	2026-10-20 10:06:23.725507+00
ZxHKywF-R	HEHE	#3B8282	425	1315	2026-10-21 02:46:57.395665+00	2026-10-21 02:46:59.223665+00
6dMQ8qKsP	HEHE	#3B8282	653.9302204824085	1184.8566527343146	2026-10-21 03:00:48.586431+00	2026-10-21 03:22:35.379993+00
5iqqRKVPO	nooogel	#3B8282	531.0799999999999	1315	2026-10-21 04:02:56.582695+00	2026-10-21 04:03:00.198231+00
nxPGs5hQO	Server Admin	#3B8282	75	1615	2026-10-21 09:04:26.917181+00	2026-10-21 09:05:07.818393+00
NQy2jl2dt	HEHE	#3B8282	538.2272191778285	1295.2128645038138	2026-10-21 08:23:11.171099+00	2026-10-21 08:25:15.37068+00
c8IxPfhhL	Who am U	#3B8282	75	1615	2026-10-21 09:04:27.524497+00	2026-10-21 09:05:08.327543+00
qsXPUfR7_	HEHE	#3B8282	75	1615	2026-10-21 09:04:27.445897+00	2026-10-21 09:05:08.540489+00
QhibZUq6J	Server Admin	#3B8282	75	1615	2026-10-21 09:05:07.942577+00	2026-10-21 09:05:09.80183+00
rnCMsqDP8	HEHE	#3B8282	1577.3799999999994	1069.5400000000002	2026-10-21 03:22:36.484931+00	2026-10-21 04:03:18.73379+00
IL1Tr0yp6	Paih	#3B8282	1015.74	1580	2026-10-21 03:57:17.323827+00	2026-10-21 04:03:18.733011+00
5zExfAbZE	Server Admin	#3B8282	697.6158432517875	1127.258904088974	2026-10-20 09:23:45.930581+00	2026-10-20 09:43:19.110373+00
z_zh7qtAd	HEHE	#3B8282	425	1315	2026-10-20 09:43:23.319328+00	2026-10-20 09:43:24.974408+00
hBDBukhgX	Server Admin	#3B8282	75	1615	2026-10-21 09:05:12.899762+00	2026-10-21 09:07:15.859335+00
7uTegaW7_	nooogel	#3B8282	425	1315	2026-10-20 09:43:26.346479+00	2026-10-20 09:43:30.906122+00
ARzF4JfKl	Pro Gamer	#3B8282	576.7588204073315	1136.3845494149587	2026-10-21 02:48:29.930673+00	2026-10-21 02:51:03.871794+00
sbGTJzGXR	Paih	#3B8282	688.5227277030475	1037.3295767707352	2026-10-21 04:24:45.223986+00	2026-10-21 04:39:00.606415+00
dinr76l-f	Who am U	#3B8282	75	1615	2026-10-21 09:07:21.394955+00	2026-10-21 09:07:23.066573+00
pZhQUXGkK	Paih	#3B8282	425	1315	2026-10-21 04:39:01.596953+00	2026-10-21 04:39:03.411583+00
yTviWyn3D	Server Admin	#3B8282	425	1315	2026-10-21 04:39:01.320691+00	2026-10-21 04:39:03.76513+00
83MWC9_oX	HEHE	#3B8282	75	1615	2026-10-21 09:07:24.147706+00	2026-10-21 09:07:26.452105+00
UYq5yCEta	Server Admin	#3B8282	425	1315	2026-10-21 04:39:03.89051+00	2026-10-21 04:39:06.768321+00
UkmOS-3jT	Server Admin	#3B8282	75	1615	2026-10-21 09:07:22.900106+00	2026-10-21 09:07:26.805931+00
2tOQS6hLc	Server Admin	#3B8282	75	1615	2026-10-21 09:07:26.929554+00	2026-10-21 09:07:27.817644+00
e-mjRrYe2	Paih	#3B8282	425	1315	2026-10-21 04:39:06.907802+00	2026-10-21 04:39:26.432085+00
LswrINszt	HEHE	#3B8282	75	1615	2026-10-21 09:07:31.135633+00	2026-10-21 09:07:33.066032+00
--HxcN0zt	Server Admin	#3B8282	75	1615	2026-10-21 09:07:31.90172+00	2026-10-21 09:08:28.347064+00
7NhQkqT_8	Paih	#3B8282	425	1315	2026-10-21 04:39:26.939103+00	2026-10-21 04:39:58.55502+00
A1HUBvpHp	Server Admin	#3B8282	425	1315	2026-10-21 04:39:25.912638+00	2026-10-21 04:39:58.779907+00
wnuqZF0bV	Server Admin	#3B8282	555.6771065260979	1288.5828934739025	2026-10-20 10:11:59.211924+00	2026-10-20 10:12:11.175216+00
p0k-om_Tg	Server Admin	#3B8282	425	1315	2026-10-21 04:40:06.885326+00	2026-10-21 04:40:18.768118+00
OnLo61QkI	Paih	#3B8282	425	1315	2026-10-21 04:40:06.926284+00	2026-10-21 04:40:19.37058+00
4SM3lY_zg	Paih	#3B8282	425	1315	2026-10-21 04:40:20.006772+00	2026-10-21 04:40:26.38902+00
Jj7OGYCWc	Server Admin	#3B8282	425	1315	2026-10-21 04:40:18.890357+00	2026-10-21 04:40:26.767127+00
Wxz_NWdNQ	Server Admin	#3B8282	425	1315	2026-10-21 04:40:26.874211+00	2026-10-21 04:40:35.77326+00
Rs4nVP2jL	Server Admin	#3B8282	425	1315	2026-10-21 04:40:35.894451+00	2026-10-21 04:41:16.770245+00
b2NGAa3V_	Paih	#3B8282	425	1315	2026-10-21 04:41:17.453285+00	2026-10-21 04:41:23.393441+00
LoLJdbaKv	Paih	#3B8282	425	1315	2026-10-21 04:41:27.013417+00	2026-10-21 04:41:33.446427+00
s-lEtSwSs	Server Admin	#3B8282	425	1315	2026-10-21 04:42:12.903423+00	2026-10-21 04:42:21.786863+00
ugjajM28i	HEHE	#3B8282	425	1315	2026-10-21 04:35:02.468655+00	2026-10-21 04:35:13.139531+00
b6U9pBMgJ	Server Admin	#3B8282	425	1315	2026-10-21 04:42:38.889598+00	2026-10-21 04:43:08.211601+00
64YVTbO4J	Server Admin	#3B8282	425	1315	2026-10-21 08:21:42.234932+00	2026-10-21 08:21:46.41508+00
xon6tXOfk	Server Admin	#3B8282	368.92643225190676	1423.8535677480932	2026-10-21 08:23:07.816826+00	2026-10-21 08:24:11.905299+00
CAqmEWkCe	Server Admin	#3B8282	232.77615223689162	1509.5562359185337	2026-10-21 09:08:58.226044+00	2026-10-21 10:07:51.925528+00
belSWan-7	Server Admin	#3B8282	2095.1144157990493	1405.261860280343	2026-10-21 08:24:12.12248+00	2026-10-21 08:38:22.168619+00
k6DZYYd25	Server Admin	#3B8282	75	1615	2026-10-21 08:38:22.428673+00	2026-10-21 08:38:22.555401+00
1k0pFMyfd	HEHE	#3B8282	658.168707755601	1713.351292244399	2026-10-21 08:25:16.100358+00	2026-10-21 08:38:23.693931+00
5FKBrcHzj	HEHE	#3B8282	75	1615	2026-10-21 08:38:44.352576+00	2026-10-21 08:38:48.122935+00
4G4hHkQa0	HEHE	#3B8282	75	1615	2026-10-21 08:38:49.459064+00	2026-10-21 08:39:06.182661+00
_4lDrsbBS	Server Admin	#3B8282	1394.4422755036937	1596.4313759260415	2026-10-21 08:40:41.247999+00	2026-10-21 08:40:47.127881+00
-8J8MUxR9	Server Admin	#3B8282	142.08	1615	2026-10-21 08:40:53.230244+00	2026-10-21 08:41:03.824381+00
6VgJwCyz3	Who am U	#3B8282	75	1615	2026-10-21 10:07:52.908052+00	2026-10-21 10:09:03.191558+00
VzHL_-gxt	Server Admin	#3B8282	75	1615	2026-10-21 10:09:03.163307+00	2026-10-21 10:09:03.9272+00
hv38o-cv2	Who am U	#3B8282	75	1615	2026-10-21 08:41:05.892208+00	2026-10-21 08:41:17.20078+00
bG1qoxTkJ	HEHE	#3B8282	75	1615	2026-10-21 08:41:06.188584+00	2026-10-21 08:41:17.207707+00
ZzW9lT0SH	Server Admin	#3B8282	75	1615	2026-10-21 08:41:03.972699+00	2026-10-21 08:41:17.812556+00
G4Emgipx0	Server Admin	#3B8282	2238.303931444749	963.2399999999998	2026-10-21 08:43:39.844391+00	2026-10-21 08:57:48.721362+00
UUGUB4huW	Server Admin	#3B8282	75	1615	2026-10-21 08:57:48.947793+00	2026-10-21 09:01:37.826997+00
2GpushACx	Server Admin	#3B8282	75	1615	2026-10-21 09:02:07.944545+00	2026-10-21 09:02:09.805474+00
yO_DCc7bO	Who am U	#3B8282	75	1615	2026-10-21 09:04:17.097454+00	2026-10-21 09:04:18.162951+00
5bMrC8aWs	HEHE	#3B8282	75	1615	2026-10-21 09:04:19.195914+00	2026-10-21 09:04:20.790095+00
BKNz_aVf5	HEHE	#3B8282	75	1615	2026-10-21 09:04:23.03483+00	2026-10-21 09:04:24.38731+00
E42ZDmIev	Who am U	#3B8282	75	1615	2026-10-21 09:04:24.276963+00	2026-10-21 09:04:25.169322+00
1yKzF9kaX	HEHE	#3B8282	75	1615	2026-10-21 09:04:24.801353+00	2026-10-21 09:04:26.399352+00
0XJQWnCG2	Server Admin	#3B8282	75	1615	2026-10-21 09:04:23.932617+00	2026-10-21 09:04:26.809819+00
J2L9UR7V1	nooogel	#3B8282	425	1315	2026-10-20 09:43:32.592449+00	2026-10-20 09:43:41.129957+00
HfsNg5PVS	Paih	#3B8282	928.2876118445749	1580	2026-10-20 10:07:23.641971+00	2026-10-20 10:32:46.177609+00
6KkyJ6OsN	Pro Gamer	#3B8282	425	1315	2026-10-21 02:14:21.301423+00	2026-10-21 02:14:21.301423+00
T2ymfgZQg	Server Admin	#3B8282	75	1615	2026-10-22 04:44:32.340722+00	2026-10-22 04:44:39.94729+00
zO6yWr8lf	HEHE	#3B8282	425	1315	2026-10-21 02:15:12.193171+00	2026-10-21 02:15:16.945914+00
4PDHObE5b	Server Admin	#3B8282	425	1315	2026-10-20 09:44:06.011672+00	2026-10-20 09:44:12.393836+00
VdShKQHcP	Paih	#3B8282	425	1315	2026-10-20 09:44:09.788895+00	2026-10-20 09:44:12.832009+00
JY0yOCosm	HEHE	#3B8282	425	1315	2026-10-20 09:48:56.314633+00	2026-10-20 09:48:56.314633+00
dNWqWG4Hz	nooogel	#3B8282	425	1315	2026-10-20 09:48:57.087475+00	2026-10-20 09:48:57.087475+00
QLYIaRpgC	nooogel	#3B8282	295.8720196377146	1258.7323881554257	2026-10-20 10:12:22.950192+00	2026-10-20 10:17:50.399806+00
gnTWAdc-M	HEHE	#3B8282	25	1365	2026-10-26 10:17:20.140971+00	2026-10-26 10:17:22.986984+00
VgPcr2_KL	Server Admin	#3B8282	75	1615	2026-10-21 09:05:09.925271+00	2026-10-21 09:05:10.805332+00
NPB1qGnKq	HEHE	#3B8282	75	1615	2026-10-21 09:01:24.514276+00	2026-10-21 09:01:36.328257+00
mV0UD5-04	Server Admin	#3B8282	75	1615	2026-10-22 04:51:01.109866+00	2026-10-22 04:51:02.921118+00
8I4B9zo-p	Server Admin	#3B8282	75	1615	2026-10-21 09:02:09.925833+00	2026-10-21 09:02:10.817096+00
tKKatTdIm	HEHE	#3B8282	425	1315	2026-10-21 04:35:14.215845+00	2026-10-21 04:35:49.223842+00
l0nGgY4Y0	HEHE	#3B8282	75	1615	2026-10-21 09:05:10.39114+00	2026-10-21 09:05:11.409499+00
qC09DLShQ	nooogel	#3B8282	1151.08477631085	835.9599999999999	2026-10-21 04:03:00.599458+00	2026-10-21 04:03:05.422467+00
DAOugFvFU	Server Admin	#3B8282	75	1615	2026-10-21 09:05:10.901711+00	2026-10-21 09:05:12.806198+00
RUVYXt236	nooogel	#3B8282	1225	915	2026-10-21 04:03:05.526089+00	2026-10-21 04:03:09.342592+00
jKiV7yI5C	Who am U	#3B8282	75	1615	2026-10-21 09:02:11.546514+00	2026-10-21 09:02:12.159074+00
Uci9XYZHS	Server Admin	#3B8282	75	1615	2026-10-22 04:58:04.10957+00	2026-10-22 04:58:05.584483+00
EwOjM1ry9	nooogel	#3B8282	2386	993.2659559035184	2026-10-21 04:03:09.499182+00	2026-10-21 04:03:18.733064+00
Ybd9j1yy_	Server Admin	#3B8282	75	1615	2026-10-22 05:21:51.26763+00	2026-10-22 05:22:29.021564+00
870jcc5OC	Who am U	#3B8282	75	1615	2026-10-21 09:05:14.343014+00	2026-10-21 09:07:16.30788+00
uWn7uri21	Pro Gamer	#3B8282	657.3630028970091	1286.3690167407049	2026-10-21 02:51:04.096063+00	2026-10-21 03:01:12.152707+00
kb5q2AW0z	Server Admin	#3B8282	75	1615	2026-10-21 09:07:15.970683+00	2026-10-21 09:07:17.807486+00
YeWMKEprl	Who am U	#3B8282	75	1615	2026-10-21 09:07:17.622994+00	2026-10-21 09:07:18.205747+00
fH36lAzfB	Server Admin	#3B8282	75	1615	2026-10-21 09:07:17.915596+00	2026-10-21 09:07:19.813883+00
8v60FaHcI	Who am U	#3B8282	75	1615	2026-10-21 09:07:19.385004+00	2026-10-21 09:07:20.14494+00
lv5Ws-a2m	HEHE	#3B8282	75	1615	2026-10-21 09:07:18.081513+00	2026-10-21 09:07:20.480755+00
Wkqq4os2U	Server Admin	#3B8282	75	1615	2026-10-21 09:07:19.908237+00	2026-10-21 09:07:21.80421+00
_g_ijaVf2	abbeyonde	#3B8282	590.2351400075054	1175.1524718370674	2026-10-20 09:28:14.400798+00	2026-10-20 09:43:20.774201+00
lx8VOGLJX	Server Admin	#3B8282	75	1615	2026-10-21 09:07:21.909989+00	2026-10-21 09:07:22.806857+00
6zTQzoVJU	HEHE	#3B8282	75	1615	2026-10-21 09:07:21.355073+00	2026-10-21 09:07:23.54696+00
DpM4MoWVz	Server Admin	#3B8282	812.9230286384745	1212.7228934739023	2026-10-21 03:01:17.95136+00	2026-10-21 04:39:00.893499+00
Hyh_BPKXs	nooogel	#3B8282	425	1315	2026-10-20 09:43:22.412744+00	2026-10-20 09:43:24.890132+00
qqU4UJWj-	Server Admin	#3B8282	425	1315	2026-10-20 09:43:24.313438+00	2026-10-20 09:43:30.216845+00
q7lY7HSA4	Who am U	#3B8282	75	1615	2026-10-21 09:07:24.066227+00	2026-10-21 09:07:26.160705+00
wARV37it_	Paih	#3B8282	425	1315	2026-10-21 04:39:03.848332+00	2026-10-21 04:39:06.400127+00
PcVM2576b	Server Admin	#3B8282	425	1315	2026-10-21 04:39:58.909937+00	2026-10-21 04:40:06.772885+00
2woJP4lSv	Who am U	#3B8282	75	1615	2026-10-21 09:07:27.345697+00	2026-10-21 09:07:28.144084+00
Z27kMOKN9	Paih	#3B8282	425	1315	2026-10-21 04:40:26.927971+00	2026-10-21 04:40:35.429999+00
wuhh686bY	nooogel	#3B8282	1225	915	2026-10-20 10:22:36.515476+00	2026-10-20 10:22:38.769447+00
XQ7SPkZ1G	HEHE	#3B8282	75	1615	2026-10-21 09:07:27.419778+00	2026-10-21 09:07:29.060371+00
55p3Llwl5	Server Admin	#3B8282	75	1615	2026-10-21 09:07:27.908411+00	2026-10-21 09:07:29.804555+00
3Y5Zcr2pY	Who am U	#3B8282	75	1615	2026-10-21 09:07:29.262248+00	2026-10-21 09:07:30.145891+00
FlTFIy901	HEHE	#3B8282	75	1615	2026-10-21 09:07:29.54713+00	2026-10-21 09:07:30.506598+00
2xpFvDlX-	Paih	#3B8282	425	1315	2026-10-21 04:40:36.00928+00	2026-10-21 04:41:16.397815+00
c-MOSIjLr	Server Admin	#3B8282	75	1615	2026-10-21 09:07:29.902081+00	2026-10-21 09:07:31.807036+00
00-GvazOZ	Paih	#3B8282	425	1315	2026-10-21 04:41:24.495996+00	2026-10-21 04:41:26.405023+00
mg1S7V9W5	Server Admin	#3B8282	425	1315	2026-10-21 04:41:23.909159+00	2026-10-21 04:41:26.775085+00
_UP1C3yRK	Who am U	#3B8282	75	1615	2026-10-21 09:07:31.129209+00	2026-10-21 09:07:32.14169+00
mlH-zi06U	Server Admin	#3B8282	425	1315	2026-10-21 04:41:26.891235+00	2026-10-21 04:41:33.777953+00
qweTLSPMB	Paih	#3B8282	425	1315	2026-10-21 04:42:13.069491+00	2026-10-21 04:42:21.398168+00
5HuRcBes9	HEHE	#3B8282	906.4313759260411	1680	2026-10-21 02:40:17.890065+00	2026-10-21 02:46:56.465316+00
53s2DxOQ5	Pro Gamer	#3B8282	425	1315	2026-10-21 02:47:04.926875+00	2026-10-21 02:47:08.768647+00
XVgczRPQm	Server Admin	#3B8282	425	1315	2026-10-21 04:42:21.908003+00	2026-10-21 04:42:38.773454+00
XEwMbYw8A	Who am U	#3B8282	595.7467170879759	1135.3287077556008	2026-10-21 08:24:01.177335+00	2026-10-21 08:38:22.271588+00
sG1oG9DYu	HEHE	#3B8282	425	1315	2026-10-21 02:47:08.854235+00	2026-10-21 02:47:19.420276+00
lcriOjBYw	Who am U	#3B8282	75	1615	2026-10-21 08:38:23.682455+00	2026-10-21 08:38:23.682455+00
EQli5ehu5	HEHE	#3B8282	75	1615	2026-10-21 08:38:24.736352+00	2026-10-21 08:38:24.736352+00
j9cayVQVd	Paih	#3B8282	425	1315	2026-10-21 04:42:40.277207+00	2026-10-21 04:43:08.211602+00
-TUprQjiG	Server Admin	#3B8282	425	1315	2026-10-21 08:21:46.583247+00	2026-10-21 08:21:46.583247+00
YWsEGaxAH	HEHE	#3B8282	425	1315	2026-10-21 02:47:20.142211+00	2026-10-21 02:47:45.612742+00
ugMEOpoVy	Who am U	#3B8282	75	1615	2026-10-21 08:38:49.720671+00	2026-10-21 08:39:07.252916+00
8EndLidp7	Who am U	#3B8282	75	1615	2026-10-21 08:39:17.508847+00	2026-10-21 08:39:18.508949+00
cn-MAbBnA	Server Admin	#3B8282	75	1615	2026-10-21 08:39:16.000828+00	2026-10-21 08:39:18.508949+00
D86wR28xp	HEHE	#3B8282	75	1615	2026-10-21 08:39:17.299965+00	2026-10-21 08:39:18.508967+00
C0sX5kxfM	Server Admin	#3B8282	186	1519.0702800150154	2026-10-21 08:40:47.269744+00	2026-10-21 08:40:53.083803+00
SVWmxeTlN	HEHE	#3B8282	75	1615	2026-10-21 08:40:49.595555+00	2026-10-21 08:40:53.128339+00
nuUlyJHuQ	Who am U	#3B8282	75	1615	2026-10-21 08:40:48.178525+00	2026-10-21 08:40:53.246402+00
gQ3wztZig	nooogel	#3B8282	425	1315	2026-10-21 04:00:42.94531+00	2026-10-21 04:02:07.414958+00
DOHtjIVK8	Who am U	#3B8282	75	1615	2026-10-21 09:02:13.416677+00	2026-10-21 09:04:16.329824+00
5_3aN1JDu	HEHE	#3B8282	75	1615	2026-10-21 09:02:12.081151+00	2026-10-21 09:04:16.432035+00
yf7XEbIiK	Server Admin	#3B8282	75	1615	2026-10-21 09:02:10.938411+00	2026-10-21 09:04:16.832158+00
gcrr0CwEO	HEHE	#3B8282	75	1615	2026-10-21 09:07:33.769674+00	2026-10-21 09:08:28.346995+00
LIdPmtLSd	HEHE	#3B8282	75	1615	2026-10-21 09:04:17.185403+00	2026-10-21 09:04:18.385002+00
uOXiwSFTH	Who am U	#3B8282	75	1615	2026-10-21 09:07:33.314935+00	2026-10-21 09:08:28.347028+00
p7dKfPREw	Who am U	#3B8282	75	1615	2026-10-21 08:40:54.948772+00	2026-10-21 08:41:04.246148+00
K5wCR_hrp	HEHE	#3B8282	75	1615	2026-10-21 08:40:54.082189+00	2026-10-21 08:41:05.470159+00
3YVTBrtk1	Who am U	#3B8282	75	1615	2026-10-21 09:04:23.029486+00	2026-10-21 09:04:23.21529+00
qYPGKR_Ao	Server Admin	#3B8282	75	1615	2026-10-21 09:04:22.593926+00	2026-10-21 09:04:23.799079+00
5DHCT50dj	HEHE	#3B8282	2250.755056325866	871.845001614312	2026-10-21 09:17:36.860567+00	2026-10-21 10:07:52.773792+00
6Fkdg6P9Z	Server Admin	#3B8282	75	1615	2026-10-21 10:07:52.273399+00	2026-10-21 10:09:02.902787+00
PBwe5qZIk	HEHE	#3B8282	425	1315	2026-10-20 09:43:32.699765+00	2026-10-20 09:43:42.629588+00
VsGutIyy7	nooogel	#3B8282	1223.3762359185337	880	2026-10-20 10:22:38.871495+00	2026-10-20 10:32:43.207465+00
6AoxMTDcU	abbeyonde	#3B8282	425	1315	2026-10-20 10:11:41.344322+00	2026-10-20 10:32:46.177559+00
HjWqo27Fv	Server Admin	#3B8282	75	1615	2026-10-22 06:55:10.235469+00	2026-10-22 06:55:11.911306+00
c-r414iHi	nooogel	#3B8282	778.8568796302063	1305.4536755787701	2026-10-21 04:02:13.354747+00	2026-10-21 04:02:39.671597+00
h45Q0X0LR	Pro Gamer	#3B8282	425	1315	2026-10-21 02:14:47.939045+00	2026-10-21 02:14:54.984499+00
5O59mhRbc	Who am U	#3B8282	75	1615	2026-10-21 09:05:10.331519+00	2026-10-21 09:05:11.162833+00
7fYY0PqPs	Server Admin	#3B8282	75	1615	2026-10-21 08:38:43.004811+00	2026-10-21 08:38:47.803524+00
NpExJoToU	HEHE	#3B8282	425	1315	2026-10-21 02:14:55.936505+00	2026-10-21 02:14:58.341005+00
kZJLkJGn3	Server Admin	#3B8282	75	1615	2026-10-22 05:22:29.285073+00	2026-10-22 05:22:30.91268+00
q--Ye2VJp	Server Admin	#3B8282	425	1315	2026-10-21 04:39:06.905491+00	2026-10-21 04:39:25.799539+00
p_2SfuIzm	nooogel	#3B8282	425	1315	2026-10-20 09:44:12.920762+00	2026-10-20 09:44:35.822937+00
hMFpCWk8C	HEHE	#3B8282	425	1315	2026-10-20 09:44:15.590004+00	2026-10-20 09:44:37.651055+00
Qc_hdbhSp	HEHE	#3B8282	425	1315	2026-10-21 02:14:58.719905+00	2026-10-21 02:15:04.33973+00
G6ILaibuP	Server Admin	#3B8282	75	1615	2026-10-22 05:22:36.043577+00	2026-10-22 05:22:37.908679+00
dMA1XhzVF	Pro Gamer	#3B8282	425	1315	2026-10-21 02:15:03.875104+00	2026-10-21 02:15:11.769603+00
hSPfEIF7k	Paih	#3B8282	425	1315	2026-10-21 04:39:59.1308+00	2026-10-21 04:40:06.385358+00
U8TWDoUbB	Pro Gamer	#3B8282	425	1315	2026-10-21 02:15:11.897521+00	2026-10-21 02:15:16.945898+00
u6rbm0-Gv	Who am U	#3B8282	75	1615	2026-10-21 08:38:44.81465+00	2026-10-21 08:38:48.22578+00
3DHZaIbs0	Server Admin	#3B8282	425	1315	2026-10-21 04:41:16.898761+00	2026-10-21 04:41:23.789852+00
n4YO4UX1G	Server Admin	#3B8282	75	1615	2026-10-22 05:22:41.03594+00	2026-10-22 05:22:41.92401+00
7EFmkjB4I	Server Admin	#3B8282	75	1615	2026-10-21 08:38:47.914556+00	2026-10-21 08:39:05.825206+00
A4G1fXEJw	Server Admin	#3B8282	75	1442.3600000000001	2026-10-21 10:12:11.56127+00	2026-10-21 10:30:47.72812+00
RL1Y2877f	Server Admin	#3B8282	425	1315	2026-10-21 04:41:33.903708+00	2026-10-21 04:41:41.811762+00
igd9XcbAi	Server Admin	#3B8282	75	1615	2026-10-21 10:30:47.990587+00	2026-10-21 10:30:50.649733+00
yCjG1f_fh	HEHE	#3B8282	664.859557442754	1364.8602510449264	2026-10-21 02:22:57.100205+00	2026-10-21 02:23:42.53363+00
OOTEdYFWH	Paih	#3B8282	425	1315	2026-10-21 04:41:34.362077+00	2026-10-21 04:41:42.382913+00
gGZa6_nFg	Pro Gamer	#3B8282	425	1315	2026-10-21 02:46:56.099488+00	2026-10-21 02:46:59.223725+00
gBA2lpEHV	HEHE	#3B8282	75	1615	2026-10-21 10:07:54.019039+00	2026-10-21 10:09:03.527187+00
r34gl1VhF	HEHE	#3B8282	425	1315	2026-10-21 02:47:06.253549+00	2026-10-21 02:47:08.355005+00
9TNVdAgVP	Who am U	#3B8282	75	1615	2026-10-21 09:01:38.278923+00	2026-10-21 09:02:07.285899+00
rB1VzIJMm	Server Admin	#3B8282	618.4724718370672	1190.4275281629327	2026-10-20 09:52:01.37217+00	2026-10-20 09:53:48.036164+00
KpMvsE4DT	Server Admin	#3B8282	75	1615	2026-10-21 09:01:38.126824+00	2026-10-21 09:02:07.807178+00
vcz2EONt5	Pro Gamer	#3B8282	425	1315	2026-10-21 02:47:08.878654+00	2026-10-21 02:47:18.326512+00
ZW_ob5oF9	Server Admin	#3B8282	75	1615	2026-10-21 09:04:16.966873+00	2026-10-21 09:04:17.806534+00
tn8NHYZIy	Server Admin	#3B8282	75	1615	2026-10-21 08:39:05.988425+00	2026-10-21 08:39:15.864865+00
-zgjj3kzG	HEHE	#3B8282	75	1615	2026-10-21 08:39:07.071054+00	2026-10-21 08:39:16.114519+00
mA9cuw9Yw	Who am U	#3B8282	75	1615	2026-10-21 08:39:08.681479+00	2026-10-21 08:39:16.194541+00
0SdziX_Vh	Server Admin	#3B8282	75	1615	2026-10-21 08:40:33.103266+00	2026-10-21 08:40:33.103266+00
aqz3Worfc	Pro Gamer	#3B8282	425	1315	2026-10-21 02:47:18.481634+00	2026-10-21 02:47:45.612742+00
Ngu2aa0rw	Who am U	#3B8282	75	1615	2026-10-21 08:40:34.400997+00	2026-10-21 08:40:34.400997+00
6LS1X_CW6	HEHE	#3B8282	75	1615	2026-10-21 08:40:34.597455+00	2026-10-21 08:40:34.597455+00
QaffWrLkR	Server Admin	#3B8282	75	1615	2026-10-21 08:41:17.95364+00	2026-10-21 08:41:17.95364+00
_qVBituEG	Paih	#3B8282	425	1315	2026-10-21 04:41:43.448195+00	2026-10-21 04:42:12.442514+00
3UFUmHknI	Server Admin	#3B8282	425	1315	2026-10-21 04:41:41.919661+00	2026-10-21 04:42:12.773456+00
eV48GDl83	Who am U	#3B8282	75	1615	2026-10-21 08:41:18.596947+00	2026-10-21 08:41:18.596947+00
DojLRRlvb	HEHE	#3B8282	75	1615	2026-10-21 08:41:18.629834+00	2026-10-21 08:41:18.629834+00
X4-epal3D	Server Admin	#3B8282	75	1615	2026-10-21 10:30:50.812579+00	2026-10-21 10:31:00.951002+00
A7wLb2Q8V	HEHE	#3B8282	75	1615	2026-10-21 10:09:04.960669+00	2026-10-21 10:09:05.455455+00
E8DujSF2d	Paih	#3B8282	425	1315	2026-10-21 04:42:22.126804+00	2026-10-21 04:42:39.397194+00
3Et-j-oBf	Who am U	#3B8282	75	1615	2026-10-21 09:04:19.323211+00	2026-10-21 09:04:20.175853+00
vH77iMujq	Server Admin	#3B8282	75	1615	2026-10-21 09:04:17.9098+00	2026-10-21 09:04:20.616235+00
edXeDTKz7	Server Admin	#3B8282	75	1615	2026-10-21 10:31:17.467321+00	2026-10-21 10:31:17.467321+00
hFyzGjXA-	Who am U	#3B8282	75	1615	2026-10-21 10:09:04.949908+00	2026-10-21 10:09:06.043576+00
8Qw9ji2ji	Server Admin	#3B8282	425	1315	2026-10-21 08:21:26.740764+00	2026-10-21 08:21:42.05564+00
MLlieChlz	Server Admin	#3B8282	75	1615	2026-10-21 10:09:04.102666+00	2026-10-21 10:09:06.185599+00
wvKYbDeiC	Server Admin	#3B8282	75	1615	2026-10-21 10:09:06.330251+00	2026-10-21 10:09:06.571523+00
MK8yLgnsW	Server Admin	#3B8282	75	1615	2026-10-21 10:31:21.477708+00	2026-10-21 10:31:21.944012+00
K4PzvluH0	Who am U	#3B8282	75	1615	2026-10-21 09:04:21.298782+00	2026-10-21 09:04:22.155685+00
bVqlyMiJW	HEHE	#3B8282	75	1615	2026-10-21 09:04:21.385985+00	2026-10-21 09:04:22.456062+00
V-wkcBzcA	Server Admin	#3B8282	75	1615	2026-10-21 09:04:20.723338+00	2026-10-21 09:04:22.484726+00
QFXE8t0CI	HEHE	#3B8282	75	1615	2026-10-21 10:09:06.025957+00	2026-10-21 10:09:07.424866+00
TBnOs2MCQ	Server Admin	#3B8282	75	1615	2026-10-21 10:31:22.090447+00	2026-10-21 10:31:22.179885+00
i5l6IBh4K	Server Admin	#3B8282	75	1615	2026-10-21 10:09:06.707175+00	2026-10-21 10:09:08.684146+00
nMmryhnft	Who am U	#3B8282	75	1615	2026-10-21 10:09:07.065109+00	2026-10-21 10:09:09.043288+00
A7MnIbksS	Server Admin	#3B8282	75	1615	2026-10-21 10:31:22.479169+00	2026-10-21 10:31:22.575356+00
gl2phlz5A	HEHE	#3B8282	75	1615	2026-10-21 10:09:08.031388+00	2026-10-21 10:09:09.572415+00
LkB7pe0BU	Server Admin	#3B8282	75	1615	2026-10-21 10:31:22.741459+00	2026-10-21 10:31:23.470111+00
8DvPxvCjj	Who am U	#3B8282	75	1615	2026-10-21 10:09:10.259443+00	2026-10-21 10:09:19.300772+00
ornFEv1Rw	HEHE	#3B8282	425	1315	2026-10-21 04:08:17.27053+00	2026-10-21 04:32:01.151036+00
QCxlsYBRv	HEHE	#3B8282	75	1615	2026-10-21 10:09:10.37745+00	2026-10-21 10:09:19.300782+00
DRCvfJFkW	Server Admin	#3B8282	75	1615	2026-10-21 10:09:08.819402+00	2026-10-21 10:09:19.301204+00
oalhLm7Ef	Server Admin	#3B8282	393.74008368164243	1295.34266817044	2026-10-21 08:21:55.675644+00	2026-10-21 08:22:59.926957+00
GsU0LGwbe	Server Admin	#3B8282	75	1615	2026-10-21 10:31:23.628757+00	2026-10-21 10:31:40.662152+00
wpfG3ZfcU	HEHE	#3B8282	712.9814306375948	1263.2915432893255	2026-10-21 08:22:08.670628+00	2026-10-21 08:23:01.704653+00
gXh1YvwRf	Server Admin	#3B8282	425	1315	2026-10-21 08:23:00.136995+00	2026-10-21 08:23:01.704655+00
JJC-UJwlS	HEHE	#3B8282	75	1615	2026-10-21 09:05:13.094292+00	2026-10-21 09:07:16.483516+00
NcgkqQBVa	Server Admin	#3B8282	332.76485999249235	1376.5140440964822	2026-10-22 05:29:09.981117+00	2026-10-22 05:34:11.075849+00
CiITxrzSY	Server Admin	#3B8282	75	1615	2026-10-22 04:44:40.148453+00	2026-10-22 04:50:41.971562+00
YiweRRiHR	Paih	#3B8282	673.0307080653333	1115.4728387623495	2026-10-20 09:34:07.326279+00	2026-10-20 09:43:19.675094+00
Ul5lZ7rbZ	HEHE	#3B8282	638.4556758885033	1193.8443241114967	2026-10-20 09:29:51.715265+00	2026-10-20 09:43:19.678994+00
PRbUU81lU	nooogel	#3B8282	632.052388155425	1173.727611844575	2026-10-20 09:31:25.204034+00	2026-10-20 09:43:20.237692+00
1A8nNmxiO	HEHE	#3B8282	425	1315	2026-10-20 09:43:27.582231+00	2026-10-20 09:43:30.715121+00
ciMxM2cz6	Server Admin	#3B8282	186	1461.80070324428	2026-10-22 04:51:03.049449+00	2026-10-22 04:54:25.056128+00
-H8rB7M0A	Server Admin	#3B8282	75	1615	2026-10-22 04:58:05.723055+00	2026-10-22 04:58:45.403537+00
xbzp9V8WK	Server Admin	#3B8282	284.5723881554251	1063.8276118445751	2026-10-26 07:08:52.098439+00	2026-10-26 07:08:57.950272+00
s0pNNmKkU	HEHE	#3B8282	75	1615	2026-10-22 07:18:44.518296+00	2026-10-22 07:18:55.826525+00
095XMf1UB	HEHE	#3B8282	75	1615	2026-10-22 07:00:22.215118+00	2026-10-22 07:01:41.154131+00
KaN29PG-3	Who am U	#3B8282	75	1615	2026-10-22 07:00:28.800496+00	2026-10-22 07:01:41.578848+00
42d5c2AdZ	Server Admin	#3B8282	75	1615	2026-10-22 04:50:42.253894+00	2026-10-22 04:50:59.92513+00
8V3EBYSO5	Server Admin	#3B8282	75	1615	2026-10-22 07:19:37.09089+00	2026-10-22 07:19:49.92054+00
kvgxdWTfY	Server Admin	#3B8282	75	1615	2026-10-22 05:52:39.165521+00	2026-10-22 05:57:19.948735+00
KR2wJe0RN	Server Admin	#3B8282	75	1615	2026-10-21 10:31:52.860059+00	2026-10-21 10:34:07.536286+00
iRg1lXR1O	Server Admin	#3B8282	75	1615	2026-10-21 10:33:41.754866+00	2026-10-21 10:34:07.541318+00
zH8ogWG8N	Server Admin	#3B8282	75	1615	2026-10-22 05:57:20.377291+00	2026-10-22 05:57:56.931991+00
0xpKiSs04	Server Admin	#3B8282	75	1615	2026-10-22 07:01:42.109183+00	2026-10-22 07:02:07.985414+00
D3uK24ycM	Server Admin	#3B8282	75	1615	2026-10-22 05:57:58.041672+00	2026-10-22 05:57:59.923257+00
fUn3-1PcH	Who am U	#3B8282	75	1615	2026-10-22 07:01:43.509689+00	2026-10-22 07:02:08.577265+00
CKRGu2hF8	Server Admin	#3B8282	75	1615	2026-10-22 05:58:01.01739+00	2026-10-22 05:58:27.917704+00
rULpQvwhC	Server Admin	#3B8282	75	1615	2026-10-22 07:02:24.064091+00	2026-10-22 07:02:53.945165+00
bwxP4A4C-	Who am U	#3B8282	75	1615	2026-10-22 07:02:27.350607+00	2026-10-22 07:02:54.597636+00
oanHueaFG	Server Admin	#3B8282	75	1615	2026-10-22 05:58:28.043364+00	2026-10-22 05:59:25.922529+00
FPtA6jm1H	Server Admin	#3B8282	75	1615	2026-10-22 05:59:28.056726+00	2026-10-22 05:59:29.908682+00
IufFFC0BQ	Server Admin	#3B8282	75	1615	2026-10-22 05:59:30.0461+00	2026-10-22 05:59:30.899108+00
cmm2yHeKk	Who am U	#3B8282	75	1615	2026-10-22 07:02:58.537799+00	2026-10-22 07:03:21.552214+00
wuCOMryKq	Server Admin	#3B8282	53.73286450381359	1503.1718522744295	2026-10-22 06:13:07.038332+00	2026-10-22 06:23:43.961426+00
Q_hqmetIo	Server Admin	#3B8282	136.68303668815162	967.1340440964818	2026-10-22 04:54:25.25114+00	2026-10-22 04:58:00.858236+00
2MP3gWMEK	HEHE	#3B8282	75	1615	2026-10-22 07:03:21.609147+00	2026-10-22 07:03:30.239124+00
u2a3KRn3_	Server Admin	#3B8282	75	1615	2026-10-22 07:03:21.065891+00	2026-10-22 07:03:30.903247+00
BLSya2JXb	Server Admin	#3B8282	75	1615	2026-10-22 05:59:33.02902+00	2026-10-22 06:00:38.921191+00
WXt7GDBQ6	Server Admin	#3B8282	75	1615	2026-10-22 06:00:40.019342+00	2026-10-22 06:00:41.906713+00
Rg6zWbuEA	Server Admin	#3B8282	75	1615	2026-10-22 06:00:46.026353+00	2026-10-22 06:00:46.894758+00
1mbcKgazP	Server Admin	#3B8282	75	1615	2026-10-22 06:01:39.068425+00	2026-10-22 06:01:40.908308+00
8xGS5QP4o	Server Admin	#3B8282	75	1615	2026-10-22 06:01:41.013734+00	2026-10-22 06:01:42.906928+00
w7qSPQNdT	Who am U	#3B8282	75	1615	2026-10-22 07:03:34.993939+00	2026-10-22 07:04:04.493721+00
RlXUlzUK1	Server Admin	#3B8282	75	1615	2026-10-22 07:03:31.033735+00	2026-10-22 07:04:04.923438+00
_vnfkMsa2	Server Admin	#3B8282	64.52067750281536	1493.6819649261608	2026-10-22 06:23:45.080947+00	2026-10-22 06:55:09.97528+00
Ojzc4IHC-	Who am U	#3B8282	151.81687963020647	1508.5583440589432	2026-10-22 06:49:05.535297+00	2026-10-22 06:55:10.635647+00
ZgjLpOP3N	Who am U	#3B8282	75	1615	2026-10-22 06:55:20.966936+00	2026-10-22 06:55:37.055087+00
TOmoPDErY	HEHE	#3B8282	75	1615	2026-10-22 06:55:12.355882+00	2026-10-22 06:55:37.055129+00
UI8b17D5i	HEHE	#3B8282	75	1615	2026-10-22 06:55:58.992822+00	2026-10-22 06:55:59.471391+00
4XiM-3bSx	Server Admin	#3B8282	75	1615	2026-10-22 06:55:58.200207+00	2026-10-22 06:55:59.895738+00
k0STQcTCU	HEHE	#3B8282	75	1615	2026-10-22 06:56:00.38918+00	2026-10-22 06:56:15.926536+00
GrL2DBjIy	HEHE	#3B8282	75	1615	2026-10-22 07:04:05.260924+00	2026-10-22 07:04:45.508723+00
1ViKMa4G_	HEHE	#3B8282	75	1615	2026-10-22 06:56:16.798987+00	2026-10-22 06:56:17.409201+00
DnY94kDOu	Who am U	#3B8282	75	1615	2026-10-22 07:04:05.638697+00	2026-10-22 07:04:45.571354+00
47AfPcc_a	HEHE	#3B8282	75	1615	2026-10-22 06:56:35.338819+00	2026-10-22 06:56:36.41981+00
rNiVVRErF	Server Admin	#3B8282	75	1615	2026-10-22 06:56:35.163365+00	2026-10-22 06:56:36.908603+00
YbOOBn4Ba	HEHE	#3B8282	75	1615	2026-10-22 07:04:46.986464+00	2026-10-22 07:05:22.873614+00
kPf-I7cVv	HEHE	#3B8282	75	1615	2026-10-22 07:05:23.868781+00	2026-10-22 07:05:32.627369+00
uZVOIvuCP	HEHE	#3B8282	75	1615	2026-10-22 07:05:33.654548+00	2026-10-22 07:06:10.198154+00
eLbScUd7N	HEHE	#3B8282	75	1615	2026-10-22 06:56:36.897764+00	2026-10-22 06:57:48.190601+00
cs_iTD7Z_	Server Admin	#3B8282	75	1615	2026-10-22 06:56:37.023622+00	2026-10-22 06:57:49.024983+00
uqp3J1hz4	Server Admin	#3B8282	75	1615	2026-10-22 07:05:33.067224+00	2026-10-22 07:06:10.919237+00
xi6l3k2Qv	Who am U	#3B8282	75	1615	2026-10-22 06:59:17.204303+00	2026-10-22 06:59:37.517635+00
G03DbH5OT	HEHE	#3B8282	75	1615	2026-10-22 07:06:10.904946+00	2026-10-22 07:06:24.507666+00
aFitjgrF5	Who am U	#3B8282	75	1615	2026-10-22 07:06:13.130586+00	2026-10-22 07:06:24.517688+00
4DuSm8-44	Server Admin	#3B8282	75	1615	2026-10-22 07:06:11.040523+00	2026-10-22 07:06:24.93597+00
AuhA1CeL1	Server Admin	#3B8282	112.13724814791749	1524.8227518520825	2026-10-22 06:02:23.060721+00	2026-10-22 06:09:47.018179+00
Uv8MnU78i	Server Admin	#3B8282	75	1615	2026-10-22 06:09:51.388969+00	2026-10-22 06:09:52.944204+00
0v41MJ5Bs	Server Admin	#3B8282	75	1615	2026-10-22 06:11:12.212873+00	2026-10-22 06:11:12.912098+00
U3LmfJa9_	Server Admin	#3B8282	75	1615	2026-10-22 06:11:15.029472+00	2026-10-22 06:11:15.913475+00
9e7kkGeSo	Server Admin	#3B8282	75	1615	2026-10-22 06:11:16.0277+00	2026-10-22 06:11:17.90752+00
d2-I2t8Rj	Server Admin	#3B8282	75	1615	2026-10-22 06:11:21.01796+00	2026-10-22 06:11:22.9381+00
bgho_41v5	Server Admin	#3B8282	75	1615	2026-10-22 06:11:23.076944+00	2026-10-22 06:11:23.912536+00
mbdzD-xIT	Server Admin	#3B8282	75	1615	2026-10-22 06:12:13.07915+00	2026-10-22 06:12:14.909521+00
WGUgPovfB	Server Admin	#3B8282	75	1615	2026-10-22 06:12:22.019043+00	2026-10-22 06:12:23.892882+00
lYGf8befo	Server Admin	#3B8282	75	1615	2026-10-22 07:06:25.098726+00	2026-10-22 07:06:57.944329+00
AAO_uOIR1	HEHE	#3B8282	75	1615	2026-10-22 07:06:25.195465+00	2026-10-22 07:06:57.948421+00
owFcH5TQB	Who am U	#3B8282	75	1615	2026-10-22 07:06:26.974564+00	2026-10-22 07:06:58.553598+00
uA0p7WE1_	HEHE	#3B8282	75	1615	2026-10-22 07:06:58.513627+00	2026-10-22 07:07:11.659996+00
LOTYkEmld	Server Admin	#3B8282	75	1615	2026-10-22 07:06:58.099442+00	2026-10-22 07:07:11.948908+00
0XQLQBqlL	HEHE	#3B8282	75	1615	2026-10-22 07:07:12.866311+00	2026-10-22 07:07:27.270673+00
17XOBgA3T	Server Admin	#3B8282	38.24126327431031	1379.7012632743101	2026-10-22 05:34:11.30137+00	2026-10-22 05:51:45.979389+00
3pqR1Tyim	Server Admin	#3B8282	75	1615	2026-10-22 05:52:20.135842+00	2026-10-22 05:52:20.921206+00
tbdJV7qXK	Who am U	#3B8282	75	1615	2026-10-22 07:07:20.558936+00	2026-10-22 07:07:27.54119+00
dV9a_LCxa	Server Admin	#3B8282	75	1615	2026-10-22 07:07:12.07535+00	2026-10-22 07:07:27.949627+00
HWf_wnoCA	Server Admin	#3B8282	75	1615	2026-10-22 05:52:25.022777+00	2026-10-22 05:52:38.968041+00
k4H9s-aEB	Who am U	#3B8282	75	1615	2026-10-22 07:07:34.698773+00	2026-10-22 07:07:57.643875+00
iLU2EyGTa	Who am U	#3B8282	75	1615	2026-10-22 07:08:02.600815+00	2026-10-22 07:08:05.238738+00
3wvxtbdDZ	Server Admin	#3B8282	75	1615	2026-10-22 07:08:04.042528+00	2026-10-22 07:08:49.930377+00
der10Rtis	Server Admin	#3B8282	106.96	1505.382800150153	2026-10-22 04:58:45.592768+00	2026-10-22 05:21:50.969164+00
IYOid2EXU	Server Admin	#3B8282	75	1615	2026-10-22 05:22:31.057557+00	2026-10-22 05:22:32.924161+00
vssKxzRMm	Server Admin	#3B8282	75	1615	2026-10-22 05:22:33.048055+00	2026-10-22 05:22:34.914954+00
Dgonp3A9h	Server Admin	#3B8282	75	1615	2026-10-22 05:22:38.029271+00	2026-10-22 05:22:38.920083+00
DU24Fgbgb	Server Admin	#3B8282	75	1615	2026-10-22 05:22:39.033272+00	2026-10-22 05:22:40.918027+00
oFdqlA517	Server Admin	#3B8282	75	1615	2026-10-22 05:22:42.053054+00	2026-10-22 05:23:35.95307+00
nFNB8HGzF	Server Admin	#3B8282	75	1615	2026-10-22 05:22:35.036879+00	2026-10-22 05:22:35.923652+00
2i2RtNKDw	Server Admin	#3B8282	75	1615	2026-10-22 05:57:57.145066+00	2026-10-22 05:57:57.918404+00
kMrAeHHa9	Server Admin	#3B8282	75	1615	2026-10-21 10:32:01.946128+00	2026-10-21 10:33:41.462422+00
jbmoe5YsA	Server Admin	#3B8282	75	1615	2026-10-22 05:23:36.142578+00	2026-10-22 05:23:36.959696+00
TRecmFgH3	Server Admin	#3B8282	75	1615	2026-10-22 07:00:21.09415+00	2026-10-22 07:01:41.95848+00
0j1F8y2kg	Server Admin	#3B8282	75	1615	2026-10-22 05:58:00.050466+00	2026-10-22 05:58:00.900743+00
jk1X-6xB2	HEHE	#3B8282	75	1615	2026-10-22 08:40:28.969764+00	2026-10-22 08:40:33.981004+00
2eEjQBjCH	Server Admin	#3B8282	75	1615	2026-10-22 05:59:26.123819+00	2026-10-22 05:59:27.91672+00
7gYbO_z2B	Server Admin	#3B8282	75	1615	2026-10-22 05:51:46.357213+00	2026-10-22 05:52:19.924638+00
7MM6aV-_g	Server Admin	#3B8282	75	1615	2026-10-22 05:59:31.021697+00	2026-10-22 05:59:32.911895+00
USNLygoki	Server Admin	#3B8282	75	1615	2026-10-22 05:23:37.087686+00	2026-10-22 05:24:12.633395+00
Hc3MmBghN	Server Admin	#3B8282	75	1615	2026-10-22 05:52:21.047655+00	2026-10-22 05:52:22.918473+00
1AqfOIY7m	Server Admin	#3B8282	75	1615	2026-10-22 05:52:23.027672+00	2026-10-22 05:52:24.915956+00
l4_foNsfX	Server Admin	#3B8282	75	1615	2026-10-22 06:00:39.071626+00	2026-10-22 06:00:39.909838+00
rLVgF8QsD	Server Admin	#3B8282	75	1615	2026-10-22 06:00:42.024164+00	2026-10-22 06:00:43.911092+00
XeE0b-sGH	Server Admin	#3B8282	75	1615	2026-10-22 06:00:44.029862+00	2026-10-22 06:00:45.913686+00
_vtCkUU9q	HEHE	#3B8282	75	1615	2026-10-22 07:01:41.859817+00	2026-10-22 07:02:07.9943+00
E2TFSEnZM	HEHE	#3B8282	75	1615	2026-10-22 07:02:08.789581+00	2026-10-22 07:02:23.386811+00
3uCt1RvNy	Server Admin	#3B8282	75	1615	2026-10-22 06:00:46.996479+00	2026-10-22 06:01:38.921606+00
beMw1V3_o	Who am U	#3B8282	75	1615	2026-10-22 07:02:17.290251+00	2026-10-22 07:02:23.556124+00
dZaU_SwVP	Server Admin	#3B8282	75	1615	2026-10-22 07:02:08.091164+00	2026-10-22 07:02:23.922776+00
z_dnEfcDt	Server Admin	#3B8282	75	1615	2026-10-22 06:01:43.035807+00	2026-10-22 06:02:22.921728+00
J_xlUn2ir	HEHE	#3B8282	75	1615	2026-10-22 07:02:24.215912+00	2026-10-22 07:02:53.834734+00
yjzKc7JHQ	Server Admin	#3B8282	75	1615	2026-10-22 06:09:47.26237+00	2026-10-22 06:09:51.11483+00
1q9Rj4RxH	HEHE	#3B8282	54.44000000000002	1387.7762359185338	2026-10-22 06:34:31.334295+00	2026-10-22 06:55:10.369918+00
WHAlxjasY	Server Admin	#3B8282	75	1615	2026-10-22 06:55:12.04029+00	2026-10-22 06:55:37.055094+00
wBtGCbNkW	Server Admin	#3B8282	75	1615	2026-10-22 06:56:00.034988+00	2026-10-22 06:56:15.922479+00
DT6i3Ztk2	Server Admin	#3B8282	75	1615	2026-10-22 06:09:53.096756+00	2026-10-22 06:11:12.069885+00
7vXoQulIE	Server Admin	#3B8282	75	1615	2026-10-22 06:56:16.049095+00	2026-10-22 06:56:17.913789+00
luyN8Bl8b	Server Admin	#3B8282	75	1615	2026-10-22 06:11:13.023536+00	2026-10-22 06:11:14.910421+00
riPzSmnHU	Server Admin	#3B8282	75	1615	2026-10-22 06:11:18.019761+00	2026-10-22 06:11:19.910545+00
7p_8AWN6q	HEHE	#3B8282	75	1615	2026-10-22 07:02:54.631574+00	2026-10-22 07:03:20.893746+00
aC4M30dBr	Server Admin	#3B8282	75	1615	2026-10-22 06:11:20.03203+00	2026-10-22 06:11:20.913126+00
rNYccKn8o	Server Admin	#3B8282	75	1615	2026-10-22 06:56:18.038682+00	2026-10-22 06:56:18.927001+00
M2Os_ws3F	Server Admin	#3B8282	75	1615	2026-10-22 07:02:54.062544+00	2026-10-22 07:03:20.910489+00
1v9EKDGlX	HEHE	#3B8282	75	1615	2026-10-22 06:56:18.467614+00	2026-10-22 06:56:19.4129+00
s2KT8huJE	Who am U	#3B8282	75	1615	2026-10-22 07:03:23.792975+00	2026-10-22 07:03:30.484569+00
uJ9--bR9-	Server Admin	#3B8282	75	1615	2026-10-22 06:11:24.021333+00	2026-10-22 06:12:12.932003+00
LRaFv3S13	HEHE	#3B8282	75	1615	2026-10-22 06:56:20.525261+00	2026-10-22 06:56:34.433241+00
Otx2tk-Ch	Server Admin	#3B8282	75	1615	2026-10-22 06:12:15.032405+00	2026-10-22 06:12:17.910882+00
B8-j4_xbO	Server Admin	#3B8282	75	1615	2026-10-22 06:56:19.024987+00	2026-10-22 06:56:34.948295+00
Tatng0E7x	Server Admin	#3B8282	75	1615	2026-10-22 06:12:18.018372+00	2026-10-22 06:12:20.911667+00
EMkUCxv_H	Server Admin	#3B8282	75	1615	2026-10-22 06:12:21.02508+00	2026-10-22 06:12:21.905464+00
sw-nZChqc	HEHE	#3B8282	75	1615	2026-10-22 07:03:31.232432+00	2026-10-22 07:04:04.486575+00
U9Ugp_DMw	Server Admin	#3B8282	75	1615	2026-10-22 06:12:23.999812+00	2026-10-22 06:13:05.935075+00
0dR7ArfhH	Server Admin	#3B8282	75	1615	2026-10-22 06:13:06.092955+00	2026-10-22 06:13:06.904542+00
RcXGgrmD3	Server Admin	#3B8282	149.9199163183579	1514.288933059063	2026-10-22 04:35:03.706919+00	2026-10-22 04:44:31.990846+00
GnsQFMY17	Who am U	#3B8282	75	1615	2026-10-22 06:56:57.889467+00	2026-10-22 06:57:48.581004+00
76GdZDPp1	Server Admin	#3B8282	75	1615	2026-10-22 04:51:00.100884+00	2026-10-22 04:51:00.939621+00
B9FCYwj9S	Server Admin	#3B8282	75	1615	2026-10-22 04:58:01.394822+00	2026-10-22 04:58:02.64661+00
SUFdEXcYM	Server Admin	#3B8282	75	1615	2026-10-22 04:58:02.811256+00	2026-10-22 04:58:03.969217+00
QFJE4f6sH	Server Admin	#3B8282	75	1615	2026-10-22 07:04:05.069616+00	2026-10-22 07:04:45.933839+00
8MbUu2_ow	Server Admin	#3B8282	75	1615	2026-10-22 07:12:58.440921+00	2026-10-22 07:19:11.164825+00
bLzRiMvPe	Server Admin	#3B8282	75	1615	2026-10-22 07:04:46.053371+00	2026-10-22 07:05:23.013381+00
1zVpp_fop	Who am U	#3B8282	75	1615	2026-10-22 07:04:48.030611+00	2026-10-22 07:05:23.485255+00
zc4PSlPpy	Server Admin	#3B8282	75	1615	2026-10-22 07:19:11.791196+00	2026-10-22 07:19:20.95316+00
WJLl-eBj7	Server Admin	#3B8282	75	1615	2026-10-22 07:05:23.220328+00	2026-10-22 07:05:32.911435+00
qDATYdnty	Who am U	#3B8282	75	1615	2026-10-22 07:05:33.24945+00	2026-10-22 07:05:33.533844+00
ljdIKf12m	Server Admin	#3B8282	75	1615	2026-10-22 07:19:21.100608+00	2026-10-22 07:19:36.962464+00
aGmAJDoGD	Who am U	#3B8282	75	1615	2026-10-22 07:05:38.599596+00	2026-10-22 07:06:10.682512+00
wDZTWDupx	Who am U	#3B8282	75	1615	2026-10-22 07:07:00.534521+00	2026-10-22 07:07:11.590828+00
c4ZPCx5oh	HEHE	#3B8282	75	1615	2026-10-22 06:57:48.672788+00	2026-10-22 06:59:11.372289+00
vEer5MlJI	Who am U	#3B8282	75	1615	2026-10-22 06:57:50.176502+00	2026-10-22 06:59:11.6567+00
AOFiZmHHX	Server Admin	#3B8282	75	1615	2026-10-22 06:57:49.142909+00	2026-10-22 06:59:11.919495+00
XS3D7KyBj	Server Admin	#3B8282	75	1615	2026-10-22 07:07:28.067937+00	2026-10-22 07:07:55.941391+00
dM3dAJ3RU	HEHE	#3B8282	75	1615	2026-10-22 07:07:28.928698+00	2026-10-22 07:07:56.152772+00
xzEJ_epgN	HEHE	#3B8282	75	1615	2026-10-22 07:07:57.573294+00	2026-10-22 07:08:03.672798+00
wPaFzcM_H	Server Admin	#3B8282	75	1615	2026-10-22 07:07:56.128371+00	2026-10-22 07:08:03.929104+00
BddC2P7Iw	HEHE	#3B8282	75	1615	2026-10-22 06:59:11.993002+00	2026-10-22 06:59:36.883953+00
VFmr3FqW0	Server Admin	#3B8282	75	1615	2026-10-22 06:59:12.07823+00	2026-10-22 06:59:36.929178+00
xzsLO38TC	HEHE	#3B8282	75	1615	2026-10-22 07:08:04.475022+00	2026-10-22 07:08:49.898341+00
Nmi0zbNyC	Who am U	#3B8282	75	1615	2026-10-22 07:08:08.101064+00	2026-10-22 07:08:50.556028+00
mYyj9VRw8	Server Admin	#3B8282	75	1615	2026-10-22 06:59:37.054636+00	2026-10-22 07:00:20.93859+00
KWOU0_umz	HEHE	#3B8282	75	1615	2026-10-22 07:08:50.424884+00	2026-10-22 07:09:06.509672+00
2RXaI2zr5	HEHE	#3B8282	75	1615	2026-10-22 06:59:37.389845+00	2026-10-22 07:00:21.126514+00
wiVa4rvKX	Who am U	#3B8282	75	1615	2026-10-22 06:59:39.846652+00	2026-10-22 07:00:21.808064+00
f61r2pF7Q	Who am U	#3B8282	75	1615	2026-10-22 07:08:54.547543+00	2026-10-22 07:09:06.637198+00
Ksi-NpNdq	Server Admin	#3B8282	75	1615	2026-10-22 07:08:50.097779+00	2026-10-22 07:09:06.926785+00
KR-_xdtDR	HEHE	#3B8282	75	1615	2026-10-22 07:09:07.602207+00	2026-10-22 07:09:31.596719+00
bPlVHu6XL	Server Admin	#3B8282	75	1615	2026-10-22 07:09:07.077309+00	2026-10-22 07:09:31.90603+00
xxBvfwHpi	Who am U	#3B8282	75	1615	2026-10-22 07:09:09.387046+00	2026-10-22 07:09:32.555808+00
Jq9lje65n	Server Admin	#3B8282	75	1615	2026-10-22 07:09:32.041721+00	2026-10-22 07:09:37.559981+00
xlqh1CRak	HEHE	#3B8282	75	1615	2026-10-22 07:09:32.468696+00	2026-10-22 07:09:37.559981+00
dlJEn_UgV	Server Admin	#3B8282	75	1615	2026-10-22 08:40:27.340447+00	2026-10-22 08:40:33.921824+00
5CTimH1Wn	HEHE	#3B8282	75	1615	2026-10-22 07:19:37.072607+00	2026-10-22 07:19:49.443638+00
dEhsBHTRL	HEHE	#3B8282	75	1615	2026-10-22 09:19:40.776632+00	2026-10-22 09:19:52.143825+00
1ZzNbY4Hv	Server Admin	#3B8282	75	1615	2026-10-22 08:40:49.118347+00	2026-10-22 08:41:10.938811+00
IFAvV39-S	HEHE	#3B8282	75	1615	2026-10-22 07:19:50.466559+00	2026-10-22 07:20:02.089534+00
qDnfUQQmS	Server Admin	#3B8282	75	1615	2026-10-22 07:19:50.067551+00	2026-10-22 07:20:02.91659+00
36X_zBUdP	Server Admin	#3B8282	75	1615	2026-10-22 08:41:11.109905+00	2026-10-22 08:41:11.109905+00
bv3jJzh20	Server Admin	#3B8282	75	1615	2026-10-22 08:42:01.121065+00	2026-10-22 08:42:03.921236+00
sV3DRmUv9	HEHE	#3B8282	75	1615	2026-10-22 08:42:28.427727+00	2026-10-22 08:42:47.04653+00
aTnY1YibF	HEHE	#3B8282	75	1615	2026-10-22 07:20:03.38936+00	2026-10-22 07:20:33.76252+00
AEtnlWKZ0	Server Admin	#3B8282	75	1615	2026-10-22 07:20:03.050198+00	2026-10-22 07:20:33.929928+00
9edUO2-Sd	Server Admin	#3B8282	75	1615	2026-10-22 08:42:47.108651+00	2026-10-22 08:43:22.951675+00
atMcKR0WV	Server Admin	#3B8282	75	1615	2026-10-22 07:20:34.062078+00	2026-10-22 07:20:45.930902+00
3se6ou9wJ	HEHE	#3B8282	75	1615	2026-10-22 07:20:34.679531+00	2026-10-22 07:20:46.111018+00
1-oyxfoUu	Server Admin	#3B8282	75	1615	2026-10-22 08:43:23.127966+00	2026-10-22 08:43:35.972072+00
hijwT-kip	Server Admin	#3B8282	75	1615	2026-10-22 08:44:51.19488+00	2026-10-22 08:44:59.958567+00
2tDKZ-2vG	HEHE	#3B8282	75	1615	2026-10-22 07:20:47.231102+00	2026-10-22 07:21:04.508042+00
z268kTlpp	Server Admin	#3B8282	75	1615	2026-10-22 07:20:46.047787+00	2026-10-22 07:21:04.916411+00
Tn8XRiKcj	Server Admin	#3B8282	75	1615	2026-10-22 08:45:00.082804+00	2026-10-22 08:45:06.940017+00
-tfFDPOKO	HEHE	#3B8282	75	1615	2026-10-22 08:45:01.139189+00	2026-10-22 08:45:06.975401+00
F1DZSKv7A	Server Admin	#3B8282	75	1615	2026-10-22 08:45:07.076699+00	2026-10-22 08:45:12.929663+00
z0NgPrXbO	HEHE	#3B8282	75	1615	2026-10-22 08:45:07.719347+00	2026-10-22 08:45:12.965633+00
_BJBMOpIz	Server Admin	#3B8282	75	1615	2026-10-22 08:45:32.061268+00	2026-10-22 08:45:43.916149+00
sMlG6imQf	HEHE	#3B8282	75	1615	2026-10-22 07:21:05.612152+00	2026-10-22 07:21:44.742361+00
C5AwDIu2l	Server Admin	#3B8282	75	1615	2026-10-22 07:21:05.071238+00	2026-10-22 07:21:44.920572+00
O3aKW3swW	Server Admin	#3B8282	75	1615	2026-10-22 08:45:44.040441+00	2026-10-22 08:45:55.914231+00
QRmdUPuZr	HEHE	#3B8282	75	1615	2026-10-22 08:45:45.506452+00	2026-10-22 08:45:55.993297+00
BCFE09W-O	Server Admin	#3B8282	75	1615	2026-10-22 08:45:56.045975+00	2026-10-22 08:46:04.909859+00
-7FNX0t-3	HEHE	#3B8282	75	1615	2026-10-22 08:45:56.869101+00	2026-10-22 08:46:04.948362+00
YSRD7HBBw	Server Admin	#3B8282	75	1615	2026-10-22 08:46:05.034685+00	2026-10-22 08:46:15.930247+00
zW00sZP2y	HEHE	#3B8282	75	1615	2026-10-22 08:46:06.087661+00	2026-10-22 08:46:15.968211+00
WUUhqx4hT	HEHE	#3B8282	75	1615	2026-10-22 07:21:45.97077+00	2026-10-22 07:22:30.854174+00
zcuzkLWqu	Server Admin	#3B8282	75	1615	2026-10-22 07:21:45.087732+00	2026-10-22 07:22:30.908425+00
m12uVU6Xc	HEHE	#3B8282	75	1615	2026-10-22 07:22:31.907053+00	2026-10-22 07:22:36.15848+00
CylscLqim	Server Admin	#3B8282	75	1615	2026-10-22 07:22:31.100689+00	2026-10-22 07:22:36.158483+00
qknGmWtyY	Server Admin	#3B8282	75	1615	2026-10-22 08:46:16.054276+00	2026-10-22 08:46:26.034851+00
sKfZsKHVe	HEHE	#3B8282	75	1615	2026-10-22 08:46:16.706592+00	2026-10-22 08:46:26.165702+00
ytXiY1RxM	HEHE	#3B8282	75	1615	2026-10-22 08:46:26.830698+00	2026-10-22 08:46:33.97605+00
Cn25QXPf4	Server Admin	#3B8282	75	1615	2026-10-22 08:46:26.211615+00	2026-10-22 08:46:33.98431+00
DjaJ2yTce	Server Admin	#3B8282	75	1615	2026-10-22 07:24:19.571289+00	2026-10-22 07:25:34.382063+00
gW3HfAy2C	Server Admin	#3B8282	75	1615	2026-10-22 07:25:34.654512+00	2026-10-22 07:25:35.253415+00
CEcyOk0ZM	Server Admin	#3B8282	75	1615	2026-10-22 08:46:47.06647+00	2026-10-22 08:47:02.944689+00
2Q9Z0tWod	HEHE	#3B8282	75	1615	2026-10-22 08:46:48.065995+00	2026-10-22 08:47:03.024651+00
8fxC3VDtF	HEHE	#3B8282	588.1657649272586	1291.287719224414	2026-10-22 09:41:53.853686+00	2026-10-22 10:05:27.99969+00
XYMZAoZM-	Server Admin	#3B8282	75	1615	2026-10-22 08:47:19.109603+00	2026-10-22 08:47:28.935713+00
mVmNdCI87	HEHE	#3B8282	75	1615	2026-10-22 08:47:19.835982+00	2026-10-22 08:47:29.154721+00
rK2I0pSY-	Server Admin	#3B8282	97.8846827288411	1652.5712922443993	2026-10-22 10:21:44.577288+00	2026-10-22 10:28:11.54388+00
8Ku4f7_BA	HEHE	#3B8282	75	1615	2026-10-22 10:05:29.225071+00	2026-10-22 10:05:50.622871+00
uslBRjNyS	Server Admin	#3B8282	75	1615	2026-10-22 08:47:29.083361+00	2026-10-22 08:48:31.939385+00
fnZLg1Nj4	HEHE	#3B8282	75	1615	2026-10-22 08:47:30.236327+00	2026-10-22 08:48:32.034332+00
IbwQW-ql0	Server Admin	#3B8282	75	1615	2026-10-22 08:48:32.108457+00	2026-10-22 08:48:45.96771+00
AGiR9xUHc	HEHE	#3B8282	75	1615	2026-10-22 08:48:46.089679+00	2026-10-22 08:48:49.045994+00
fvJPyoqHg	Server Admin	#3B8282	75	1615	2026-10-22 08:48:46.09369+00	2026-10-22 08:48:49.974927+00
feZXsZVCt	HEHE	#3B8282	75	1615	2026-10-22 08:48:49.499483+00	2026-10-22 08:48:53.793479+00
K1rpH2cZU	Server Admin	#3B8282	75	1615	2026-10-22 08:48:50.11204+00	2026-10-22 08:48:53.931524+00
x8Rlqhy8l	HEHE	#3B8282	75	1615	2026-10-22 08:48:54.315973+00	2026-10-22 08:48:58.067233+00
d1_V4ZTuB	Server Admin	#3B8282	75	1615	2026-10-22 08:48:54.05003+00	2026-10-22 08:48:58.955401+00
VrsW3ohRz	HEHE	#3B8282	75	1615	2026-10-22 08:48:58.574437+00	2026-10-22 08:49:07.173802+00
GfhxYlNiE	Server Admin	#3B8282	75	1615	2026-10-22 08:48:59.065838+00	2026-10-22 08:49:07.954467+00
QubhzIv_1	HEHE	#3B8282	75	1615	2026-10-22 08:49:07.975685+00	2026-10-22 08:49:12.629187+00
XX14KXrTE	Server Admin	#3B8282	75	1615	2026-10-22 08:49:08.076518+00	2026-10-22 08:49:12.919875+00
xu9reDS1R	HEHE	#3B8282	75	1615	2026-10-22 08:51:42.856357+00	2026-10-22 08:51:56.325856+00
KDlCpfbkT	Server Admin	#3B8282	75	1615	2026-10-22 07:25:35.427259+00	2026-10-22 07:33:28.94832+00
DZEinJryu	HEHE	#3B8282	75	1615	2026-10-22 07:33:29.777268+00	2026-10-22 07:33:55.651059+00
RjJKG3bVI	Server Admin	#3B8282	75	1615	2026-10-22 07:33:29.232795+00	2026-10-22 07:33:55.956626+00
_BTRaGU5W	HEHE	#3B8282	75	1615	2026-10-22 07:33:57.103987+00	2026-10-22 07:34:01.038608+00
oo1ZaGZg2	Server Admin	#3B8282	75	1615	2026-10-22 07:33:56.13614+00	2026-10-22 07:34:01.92094+00
Wu31lD4Px	HEHE	#3B8282	75	1615	2026-10-22 07:34:01.778476+00	2026-10-22 07:34:06.102092+00
EZfYE5wXV	Server Admin	#3B8282	75	1615	2026-10-22 07:34:02.307493+00	2026-10-22 07:34:06.913194+00
T7fkcVo1e	Server Admin	#3B8282	75	1615	2026-10-22 07:34:07.056531+00	2026-10-22 07:34:17.945927+00
eoGWyG-jy	HEHE	#3B8282	75	1615	2026-10-22 07:34:06.963665+00	2026-10-22 07:34:17.969336+00
G6pnRC1rL	Server Admin	#3B8282	75	1615	2026-10-22 07:34:18.062876+00	2026-10-22 07:34:22.913033+00
ZKHoZyC-O	HEHE	#3B8282	75	1615	2026-10-22 07:34:19.387945+00	2026-10-22 07:34:22.954818+00
Q99jy7Fcn	HEHE	#3B8282	75	1615	2026-10-22 07:34:23.78005+00	2026-10-22 07:34:32.934515+00
rBCSaCQi9	Server Admin	#3B8282	75	1615	2026-10-22 07:34:23.040054+00	2026-10-22 07:34:32.963119+00
uCtOS-nLb	HEHE	#3B8282	75	1615	2026-10-22 07:34:34.773777+00	2026-10-22 07:34:43.759974+00
uC_y4urlx	Server Admin	#3B8282	75	1615	2026-10-22 07:34:33.10438+00	2026-10-22 07:34:43.948926+00
ReRQcnqP5	Server Admin	#3B8282	75	1615	2026-10-22 07:34:44.094831+00	2026-10-22 07:34:52.91922+00
uR1UsFk4W	HEHE	#3B8282	75	1615	2026-10-22 07:34:44.785054+00	2026-10-22 07:34:53.000902+00
4BvFoGXsI	HEHE	#3B8282	75	1615	2026-10-22 07:34:53.891056+00	2026-10-22 07:34:55.008643+00
kGBrNODQn	HEHE	#3B8282	75	1615	2026-10-22 07:34:55.533914+00	2026-10-22 07:34:55.533914+00
OnVeoSAyy	Server Admin	#3B8282	75	1615	2026-10-22 07:34:53.045183+00	2026-10-22 07:34:55.91441+00
nOemjm13V	Server Admin	#3B8282	75	1615	2026-10-22 07:34:56.035761+00	2026-10-22 07:34:56.035761+00
8kPjKG2Xt	HEHE	#3B8282	25	1365	2026-10-28 09:03:12.058339+00	2026-10-28 09:03:13.416417+00
qJENsnV9Y	HEHE	#3B8282	1360.4007520171547	1372.4860972034187	2026-10-26 09:41:43.117254+00	2026-10-26 09:43:37.661029+00
oTflSnKZ4	Server Admin	#3B8282	141.2512696101495	1460.3064406741269	2026-10-22 10:28:11.77278+00	2026-10-22 10:30:35.021132+00
bIhApm3O9	HEHE	#3B8282	75	1615	2026-10-23 03:09:37.678641+00	2026-10-23 04:07:16.746223+00
9-GOKM7oC	Server Admin	#3B8282	186	1590.9887077556007	2026-10-22 07:35:03.593905+00	2026-10-22 08:39:48.94058+00
cCrLTlsQ5	Server Admin	#3B8282	75	1615	2026-10-22 08:40:34.101842+00	2026-10-22 08:40:48.978783+00
cyrNG1juo	HEHE	#3B8282	75	1615	2026-10-22 08:40:35.090604+00	2026-10-22 08:40:50.251658+00
QfEh1OF3W	HEHE	#3B8282	75	1615	2026-10-23 04:18:25.780228+00	2026-10-23 04:18:42.987948+00
EtHpBAOMP	HEHE	#3B8282	75	1615	2026-10-22 08:40:51.303732+00	2026-10-22 08:41:11.071966+00
_szL9J8Lk	HEHE	#3B8282	75	1615	2026-10-22 08:41:11.88791+00	2026-10-22 08:41:11.88791+00
CQ5Ug-1xh	Server Admin	#3B8282	198.7153176874396	1503.4026554632146	2026-10-22 09:34:33.227864+00	2026-10-22 10:05:27.999046+00
JBiPrL5vj	Server Admin	#3B8282	75	1615	2026-10-22 08:42:04.049417+00	2026-10-22 08:42:24.941708+00
-rpBth2mf	Server Admin	#3B8282	75	1615	2026-10-22 10:05:28.283766+00	2026-10-22 10:05:50.9854+00
gX26SgGCT	HEHE	#3B8282	75	1615	2026-10-22 08:42:04.759202+00	2026-10-22 08:42:26.795157+00
IYHTfDD4W	HEHE	#3B8282	75	1615	2026-10-22 10:05:51.941257+00	2026-10-22 10:05:55.590786+00
D3eDSyajM	Server Admin	#3B8282	75	1615	2026-10-22 10:05:51.215113+00	2026-10-22 10:05:55.928276+00
LdIF5s4Tx	Server Admin	#3B8282	75	1615	2026-10-22 10:05:56.061424+00	2026-10-22 10:05:56.061424+00
_NYa855uv	Server Admin	#3B8282	75	1615	2026-10-22 08:42:25.085528+00	2026-10-22 08:42:46.965093+00
zlcgmZINH	HEHE	#3B8282	75	1615	2026-10-22 10:05:56.438606+00	2026-10-22 10:05:56.438606+00
hefGhO6Zj	HEHE	#3B8282	75	1615	2026-10-22 10:06:07.235081+00	2026-10-22 10:06:11.651364+00
47ZNdFIZz	Server Admin	#3B8282	161.89043859474222	1532.496228043028	2026-10-22 09:06:40.565524+00	2026-10-22 09:19:39.992831+00
HBDewDyOH	Server Admin	#3B8282	75	1615	2026-10-22 10:06:05.096272+00	2026-10-22 10:06:11.92868+00
Hh3VBQsEd	Server Admin	#3B8282	75	1615	2026-10-22 09:19:40.298892+00	2026-10-22 09:19:52.960643+00
_x_ty7QWI	HEHE	#3B8282	75	1615	2026-10-22 08:42:47.72862+00	2026-10-22 08:43:23.07722+00
0ohpyKmPL	Server Admin	#3B8282	232.1172647656868	1524.0555253343878	2026-10-26 09:56:30.018837+00	2026-10-26 10:17:22.987026+00
4TnLVUyv7	HEHE	#3B8282	75	1615	2026-10-22 09:19:53.049074+00	2026-10-22 09:20:00.726949+00
O0uvIHurr	HEHE	#3B8282	75	1615	2026-10-22 08:43:23.933482+00	2026-10-22 08:43:35.996435+00
4x1k4ragI	Server Admin	#3B8282	75	1615	2026-10-22 09:19:53.092444+00	2026-10-22 09:20:00.963347+00
o6g5Ykz0c	Server Admin	#3B8282	75	1615	2026-10-22 09:20:01.097859+00	2026-10-22 09:20:01.097859+00
zDQzLKhGF	HEHE	#3B8282	75	1615	2026-10-22 09:20:02.032197+00	2026-10-22 09:20:02.032197+00
vPdLpua1F	HEHE	#3B8282	25	1365	2026-10-26 10:18:09.932433+00	2026-10-26 10:18:13.187001+00
nsE90KZdG	Server Admin	#3B8282	75	1615	2026-10-22 09:21:08.109783+00	2026-10-22 09:21:13.149912+00
zX53Yo-5W	HEHE	#3B8282	75	1615	2026-10-22 09:21:10.960402+00	2026-10-22 09:21:13.149882+00
KXmpLAX0T	Server Admin	#3B8282	75	1615	2026-10-22 10:06:12.059211+00	2026-10-22 10:06:20.958954+00
UB5TznwmP	HEHE	#3B8282	75	1615	2026-10-22 10:06:12.307079+00	2026-10-22 10:06:21.66453+00
8P5vK5WWA	Server Admin	#3B8282	75	1615	2026-10-22 10:06:21.091281+00	2026-10-22 10:06:22.189474+00
gOtjmfT0B	HEHE	#3B8282	75	1615	2026-10-22 10:06:22.655491+00	2026-10-22 10:06:22.655491+00
jGe-Xncpp	HEHE	#3B8282	25	1365	2026-10-26 10:18:18.610115+00	2026-10-26 10:18:21.181248+00
i9AInPjdk	HEHE	#3B8282	25	1365	2026-10-26 10:18:21.65401+00	2026-10-26 10:18:27.187377+00
-TVeOWTxd	Server Admin	#3B8282	25	1365	2026-10-26 10:18:27.22847+00	2026-10-26 10:18:27.22847+00
zQ1jis_JT	HEHE	#3B8282	25	1365	2026-10-26 10:18:27.899591+00	2026-10-26 10:18:27.899591+00
HVXEs1-_g	Server Admin	#3B8282	25	1365	2026-10-26 10:21:42.406984+00	2026-10-26 10:21:45.089862+00
tUm93_W3G	Server Admin	#3B8282	75	1615	2026-10-22 08:43:36.107824+00	2026-10-22 08:44:50.997786+00
fvLc2IAF6	HEHE	#3B8282	75	1615	2026-10-22 08:43:36.561301+00	2026-10-22 08:44:51.077802+00
J-pTcpe3W	HEHE	#3B8282	75	1615	2026-10-22 08:44:51.989424+00	2026-10-22 08:44:59.985687+00
mes7I40Oy	HEHE	#3B8282	75	1615	2026-10-22 08:45:13.60831+00	2026-10-22 08:45:31.19615+00
j7kYk8jSO	Server Admin	#3B8282	156.2066770550499	1517.4423758140476	2026-10-22 08:45:13.074425+00	2026-10-22 08:45:31.92998+00
E2_1Cjtis	HEHE	#3B8282	75	1615	2026-10-22 08:45:32.125995+00	2026-10-22 08:45:44.250957+00
LdiI6fkuo	Server Admin	#3B8282	102.60266216180871	1378.4793496582674	2026-10-22 09:21:42.630149+00	2026-10-22 09:25:33.984499+00
G8ue_xAfy	Server Admin	#3B8282	75	1615	2026-10-22 08:46:34.147531+00	2026-10-22 08:46:46.923289+00
crZYjtYeF	HEHE	#3B8282	75	1615	2026-10-22 08:46:35.011775+00	2026-10-22 08:46:47.248456+00
AsH2iif51	Server Admin	#3B8282	75	1615	2026-10-22 09:26:07.317923+00	2026-10-22 09:26:26.943093+00
zPu6kZ8Yf	Server Admin	#3B8282	75	1615	2026-10-22 08:47:03.100202+00	2026-10-22 08:47:18.91091+00
CLwAkKya8	HEHE	#3B8282	75	1615	2026-10-22 08:47:03.593406+00	2026-10-22 08:47:18.984172+00
wP2fCHXGG	HEHE	#3B8282	75	1615	2026-10-22 09:26:08.251289+00	2026-10-22 09:26:27.203933+00
8JD17SR2c	Server Admin	#3B8282	143.82	1365	2026-10-26 07:09:07.529869+00	2026-10-26 08:44:08.827682+00
kBA5BQV9g	HEHE	#3B8282	75	1615	2026-10-22 08:48:32.621384+00	2026-10-22 08:48:45.389697+00
xZw3OwUU5	HEHE	#3B8282	75	1615	2026-10-22 08:49:13.118907+00	2026-10-22 08:49:18.100392+00
fPjoW7iFr	Server Admin	#3B8282	75	1615	2026-10-22 08:49:13.046365+00	2026-10-22 08:49:18.100852+00
Us8Aqm2rN	Server Admin	#3B8282	75	1615	2026-10-22 09:26:27.101875+00	2026-10-22 09:26:43.952122+00
fLqbwzn9O	HEHE	#3B8282	75	1615	2026-10-22 09:26:28.744205+00	2026-10-22 09:26:44.33956+00
zwxYUNev9	Server Admin	#3B8282	851.8752236891496	1329.5647763108502	2026-10-26 05:39:09.620157+00	2026-10-26 07:08:51.543341+00
70qnZr2jg	Server Admin	#3B8282	1096.619916318358	1053.8896363033425	2026-10-26 07:08:58.030925+00	2026-10-26 07:09:02.252617+00
9-b0v5YGu	HEHE	#3B8282	75	1615	2026-10-22 09:26:45.387069+00	2026-10-22 09:27:28.64086+00
yZxFyfrmp	Server Admin	#3B8282	75	1615	2026-10-22 09:26:44.072581+00	2026-10-22 09:27:28.640861+00
SedheuWqe	HEHE	#3B8282	75	1615	2026-10-22 09:27:49.220627+00	2026-10-22 09:27:54.109934+00
2WgfDTY2u	HEHE	#3B8282	75	1615	2026-10-22 09:29:56.480173+00	2026-10-22 09:29:56.567594+00
Drr1WFtOc	Server Admin	#3B8282	75	1615	2026-10-22 09:29:54.206993+00	2026-10-22 09:29:56.920064+00
lEtQ0zUtx	Server Admin	#3B8282	75	1615	2026-10-22 09:29:57.062926+00	2026-10-22 09:30:00.947423+00
Zz8qnRp79	HEHE	#3B8282	75	1615	2026-10-22 09:29:57.138255+00	2026-10-22 09:30:01.582208+00
PVgCW3Tm_	HEHE	#3B8282	75	1615	2026-10-22 09:30:02.773152+00	2026-10-22 09:30:06.610602+00
pZ6E1_U03	Server Admin	#3B8282	75	1615	2026-10-22 09:30:01.05538+00	2026-10-22 09:30:06.916435+00
r6LTTh9Tg	HEHE	#3B8282	75	1615	2026-10-22 09:30:07.908197+00	2026-10-22 09:30:12.090206+00
rBRsBQsWa	Server Admin	#3B8282	75	1615	2026-10-22 09:30:07.044736+00	2026-10-22 09:30:12.090249+00
S3f0A_LdB	Server Admin	#3B8282	166.6102883985454	1606.3529762726084	2026-10-22 09:32:55.886703+00	2026-10-22 09:34:32.975793+00
ZM6F_69sK	Server Admin	#3B8282	745.5389928694715	1209.5831445188287	2026-10-23 07:12:36.814349+00	2026-10-23 10:33:15.742379+00
x5bd91IyH	HEHE	#3B8282	863.5847408988983	1476.610991941638	2026-10-22 10:13:41.720477+00	2026-10-22 10:17:04.357659+00
LRZBI1VTQ	Server Admin	#3B8282	668.9448533535503	1485.5563905060565	2026-10-22 10:10:27.887544+00	2026-10-22 10:17:04.357659+00
ULnH-Onv_	HEHE	#3B8282	75	1615	2026-10-22 10:17:19.153743+00	2026-10-22 10:17:19.756179+00
a7ZYPAZwn	Server Admin	#3B8282	75	1615	2026-10-22 10:17:18.464522+00	2026-10-22 10:17:19.909136+00
8JPcVm7J0	HEHE	#3B8282	75	1615	2026-10-22 10:17:20.929708+00	2026-10-22 10:17:24.715924+00
tDD9CJae8	Server Admin	#3B8282	75	1615	2026-10-22 10:17:20.040058+00	2026-10-22 10:17:24.945626+00
Vz9GTXGyR	Server Admin	#3B8282	75	1615	2026-10-22 10:17:25.087595+00	2026-10-22 10:17:25.087595+00
KHaHPw7a4	HEHE	#3B8282	75	1615	2026-10-22 10:17:25.781967+00	2026-10-22 10:17:25.781967+00
ii6ZvFqhR	Server Admin	#3B8282	25	1365	2026-10-26 10:18:09.426432+00	2026-10-26 10:18:13.111912+00
5E6r76VJA	Server Admin	#3B8282	25	1365	2026-10-26 13:03:37.093513+00	2026-10-26 13:03:49.829275+00
J4Xtp_jUU	Server Admin	#3B8282	121.95488027526396	1551.4741758702453	2026-10-22 10:18:22.182052+00	2026-10-22 10:21:44.344835+00
ZseLeV7kb	HEHE	#3B8282	25	1365	2026-10-26 10:18:13.64063+00	2026-10-26 10:18:18.223046+00
JOUljtyAh	Server Admin	#3B8282	25	1365	2026-10-26 10:18:13.251011+00	2026-10-26 10:18:19.101649+00
eOR5Cmy8s	Server Admin	#3B8282	25	1365	2026-10-26 10:18:19.201482+00	2026-10-26 10:18:21.108056+00
zPEXYUBb-	Server Admin	#3B8282	25	1365	2026-10-26 10:18:21.213606+00	2026-10-26 10:18:27.113131+00
_8GqNb5hn	HEHE	#3B8282	25	1365	2026-10-26 10:21:43.064284+00	2026-10-26 10:21:45.243623+00
90yvFk7wl	Server Admin	#3B8282	25	1365	2026-10-26 10:21:45.253324+00	2026-10-26 10:21:48.098902+00
J21DupYgW	HEHE	#3B8282	25	1365	2026-10-26 10:21:45.859394+00	2026-10-26 10:21:48.195175+00
royX_RKxF	Server Admin	#3B8282	75	1615	2026-10-23 04:06:45.570029+00	2026-10-23 07:12:36.281056+00
dktZnDBkX	Server Admin	#3B8282	25	1365	2026-10-26 10:21:48.219478+00	2026-10-26 10:21:55.119059+00
o3kP9D10s	HEHE	#3B8282	25	1365	2026-10-26 10:21:48.691883+00	2026-10-26 10:21:55.259652+00
NttuHUKYT	Server Admin	#3B8282	2197.633910140437	661.2982845263368	2026-10-23 03:10:06.441511+00	2026-10-23 04:06:44.664592+00
o_gSZWeFy	Server Admin	#3B8282	25	1365	2026-10-26 10:21:55.257526+00	2026-10-26 10:22:01.108601+00
idKdJ4Ew9	HEHE	#3B8282	25	1365	2026-10-26 10:21:56.051871+00	2026-10-26 10:22:01.197958+00
2Qunt603t	HEHE	#3B8282	75	1615	2026-10-23 04:07:20.816873+00	2026-10-23 04:07:28.802957+00
EO3YonfRS	Server Admin	#3B8282	106.12210973284019	1372.473950781565	2026-10-26 05:36:11.940245+00	2026-10-26 05:39:09.366869+00
BIrFF5sgY	Server Admin	#3B8282	25	1365	2026-10-26 10:22:01.231725+00	2026-10-26 10:22:15.11493+00
m106y79Na	HEHE	#3B8282	25	1365	2026-10-26 10:22:01.620904+00	2026-10-26 10:22:15.25205+00
8Iw9-4uW4	Server Admin	#3B8282	435.4389625289688	1434.3686046382584	2026-10-26 05:23:58.496962+00	2026-10-26 05:30:32.332093+00
zIu0QQiOf	Server Admin	#3B8282	25	1365	2026-10-26 10:22:15.226015+00	2026-10-26 10:22:57.135958+00
xVHOn0y2h	HEHE	#3B8282	75	1615	2026-10-23 05:23:03.14882+00	2026-10-23 05:40:13.34399+00
2GOocArdP	HEHE	#3B8282	25	1365	2026-10-26 10:22:16.145381+00	2026-10-26 10:22:57.248512+00
bKakiHLyB	Server Admin	#3B8282	25	1365	2026-10-26 10:22:57.262505+00	2026-10-26 10:23:04.143863+00
bdVnsfQDd	HEHE	#3B8282	25	1365	2026-10-26 10:22:57.918759+00	2026-10-26 10:23:04.203889+00
NETeSFSFR	Server Admin	#3B8282	31.709509515463253	1732.7157595701456	2026-10-26 05:30:47.375563+00	2026-10-26 05:32:14.679728+00
2ETOJPiGN	Server Admin	#3B8282	25	1365	2026-10-26 10:23:04.296142+00	2026-10-26 10:23:13.105961+00
x825nRwiV	HEHE	#3B8282	25	1365	2026-10-26 10:23:04.772458+00	2026-10-26 10:23:13.240983+00
jgE7jIqix	HEHE	#3B8282	69.18361267453464	1383.4699066446174	2026-10-22 10:18:25.283937+00	2026-10-22 10:28:26.380639+00
3K3sg2zti	Server Admin	#3B8282	25	1365	2026-10-26 10:23:13.234545+00	2026-10-26 10:23:16.10331+00
iJBnlPIjL	HEHE	#3B8282	25	1365	2026-10-26 10:23:13.984912+00	2026-10-26 10:23:16.200215+00
6TCOcM8gy	Server Admin	#3B8282	25	1365	2026-10-26 10:23:16.212682+00	2026-10-26 10:23:25.096345+00
uKbNbhf24	HEHE	#3B8282	25	1365	2026-10-26 10:23:16.652308+00	2026-10-26 10:23:25.221713+00
r8bBtakv-	Server Admin	#3B8282	25	1365	2026-10-26 10:23:25.214451+00	2026-10-26 10:23:30.10353+00
7CT0NMv9P	HEHE	#3B8282	25	1365	2026-10-26 10:23:25.806398+00	2026-10-26 10:23:30.199645+00
EPnKWGLhc	Server Admin	#3B8282	25	1365	2026-10-26 10:23:30.202299+00	2026-10-26 10:23:33.101374+00
WEHAZF4VN	HEHE	#3B8282	25	1365	2026-10-26 10:23:30.746158+00	2026-10-26 10:23:33.201472+00
1jv7fj_Jo	Server Admin	#3B8282	25	1365	2026-10-26 10:23:33.201062+00	2026-10-26 10:23:36.098631+00
VUOy1LBIt	HEHE	#3B8282	75	1615	2026-10-22 10:28:27.226301+00	2026-10-22 10:30:34.09981+00
ACJjQk1S9	HEHE	#3B8282	25	1365	2026-10-26 10:23:33.660043+00	2026-10-26 10:23:36.199667+00
cJYcmbEKD	Server Admin	#3B8282	25	1365	2026-10-26 10:23:36.210827+00	2026-10-26 10:23:39.100837+00
5lVHU9Bhg	HEHE	#3B8282	25	1365	2026-10-26 10:23:36.690011+00	2026-10-26 10:23:39.200853+00
rpecQ5NgE	Server Admin	#3B8282	25	1365	2026-10-26 10:23:39.211377+00	2026-10-26 10:23:47.114876+00
BIY76jNqv	HEHE	#3B8282	25	1365	2026-10-26 10:23:39.623759+00	2026-10-26 10:23:47.276434+00
bqFqhSU2d	Server Admin	#3B8282	142.3800836816421	1362.908836114548	2026-10-26 05:32:14.923354+00	2026-10-26 05:36:11.679862+00
tDlQWTpvV	Server Admin	#3B8282	25	1365	2026-10-26 10:23:47.242082+00	2026-10-26 10:23:59.114332+00
aPul9lyEE	HEHE	#3B8282	194.04969477984486	1208.3930673614138	2026-10-26 05:35:55.469102+00	2026-10-26 08:44:08.827383+00
5fDknyxYl	HEHE	#3B8282	25	1365	2026-10-26 10:23:47.844933+00	2026-10-26 10:23:59.296296+00
C0LWnBCZP	Server Admin	#3B8282	25	1365	2026-10-26 10:23:59.228591+00	2026-10-26 10:24:15.109268+00
Z6VzNF5a5	HEHE	#3B8282	25	1365	2026-10-26 10:23:59.9899+00	2026-10-26 10:24:15.195017+00
IdkZRPxCr	Server Admin	#3B8282	1225	915	2026-10-26 07:09:02.295584+00	2026-10-26 07:09:07.489139+00
ApXkN93jd	Server Admin	#3B8282	25	1365	2026-10-26 10:24:15.28117+00	2026-10-26 10:24:21.104655+00
VrBFGEmHt	HEHE	#3B8282	25	1365	2026-10-26 10:24:15.740169+00	2026-10-26 10:24:21.226243+00
PW52WSYMr	Server Admin	#3B8282	25	1365	2026-10-26 10:24:21.217619+00	2026-10-26 10:24:27.107179+00
BBmy0P5QV	HEHE	#3B8282	25	1365	2026-10-26 10:24:21.743532+00	2026-10-26 10:24:27.207119+00
wkKiESAbV	Server Admin	#3B8282	25	1365	2026-10-26 10:24:27.219531+00	2026-10-26 10:24:34.097709+00
_Iai0hqfp	HEHE	#3B8282	25	1365	2026-10-26 10:24:27.604086+00	2026-10-26 10:24:34.270197+00
6k4NKPNML	Server Admin	#3B8282	25	1365	2026-10-26 10:24:34.216233+00	2026-10-26 10:24:46.112616+00
rgMiIjexL	HEHE	#3B8282	192.50810973678415	1513.4863921685333	2026-10-26 10:24:35.167851+00	2026-10-26 10:24:46.353443+00
HM2mliBip	Server Admin	#3B8282	25	1365	2026-10-26 10:24:46.218891+00	2026-10-26 10:24:50.103977+00
zmhcOwGYq	HEHE	#3B8282	25	1365	2026-10-26 10:24:47.020094+00	2026-10-26 10:24:50.183076+00
YFrsdEX_C	Server Admin	#3B8282	1798.5357988127216	838.6275288786115	2026-10-26 09:19:26.215579+00	2026-10-26 09:43:32.81892+00
KWw5CiE0C	Server Admin	#3B8282	25	1365	2026-10-26 10:24:50.221543+00	2026-10-26 10:25:04.115278+00
Zuhzi_O-I	HEHE	#3B8282	25	1365	2026-10-26 10:24:50.664948+00	2026-10-26 10:25:04.283645+00
J3SM168As	Server Admin	#3B8282	25	1365	2026-10-26 10:25:04.228936+00	2026-10-26 10:25:18.100298+00
MJ51yArSW	HEHE	#3B8282	25	1365	2026-10-26 10:25:04.958778+00	2026-10-26 10:25:18.278341+00
k1tDfc7bH	Server Admin	#3B8282	25	1365	2026-10-26 10:25:18.213316+00	2026-10-26 10:25:25.107453+00
9ocdhA17N	HEHE	#3B8282	25	1365	2026-10-26 10:25:18.856854+00	2026-10-26 10:25:25.196028+00
gEJJRa2Fn	Server Admin	#3B8282	25	1365	2026-10-26 10:25:25.231603+00	2026-10-26 10:25:30.103147+00
4lO7iPTF_	HEHE	#3B8282	25	1365	2026-10-26 10:25:25.73875+00	2026-10-26 10:25:30.197717+00
xKHyEETE9	Server Admin	#3B8282	25	1365	2026-10-26 10:25:30.201309+00	2026-10-26 10:25:39.152184+00
wW4xBXzYa	HEHE	#3B8282	25	1365	2026-10-26 10:25:30.619366+00	2026-10-26 10:25:39.227384+00
JqIYA9JSn	Server Admin	#3B8282	25	1365	2026-10-26 10:25:39.28088+00	2026-10-26 10:25:45.110671+00
2xJw_GCcp	HEHE	#3B8282	25	1365	2026-10-26 10:25:39.813459+00	2026-10-26 10:25:45.181321+00
lwT-jys6m	Server Admin	#3B8282	25	1365	2026-10-26 10:25:45.228359+00	2026-10-26 10:25:51.139165+00
BpaAFrvby	HEHE	#3B8282	25	1365	2026-10-26 10:25:45.634413+00	2026-10-26 10:25:51.193897+00
8asFh4uFc	Server Admin	#3B8282	25	1365	2026-10-26 10:25:51.258309+00	2026-10-26 10:26:04.0863+00
5FvjxXG7r	HEHE	#3B8282	25	1365	2026-10-26 10:25:51.970452+00	2026-10-26 10:26:04.2389+00
3GEi_acuH	Server Admin	#3B8282	25	1365	2026-10-26 10:26:04.287911+00	2026-10-26 10:26:10.097729+00
1Xr1YcQVq	HEHE	#3B8282	25	1365	2026-10-26 10:26:04.855969+00	2026-10-26 10:26:10.210688+00
HS_N1ua-m	Server Admin	#3B8282	25	1365	2026-10-26 10:26:10.268295+00	2026-10-26 10:26:19.164189+00
QI7bkFN6Q	HEHE	#3B8282	25	1365	2026-10-26 10:26:10.717666+00	2026-10-26 10:26:19.238736+00
mltn3FiQg	HEHE	#3B8282	25	1365	2026-10-26 10:26:19.893622+00	2026-10-26 10:26:25.183876+00
NJJwRU-8V	Server Admin	#3B8282	25	1365	2026-10-26 10:26:19.458905+00	2026-10-26 10:26:25.099668+00
VPXB-dVNf	Server Admin	#3B8282	25	1365	2026-10-26 13:03:49.956423+00	2026-10-26 13:03:55.81101+00
-2NveoeM4	HEHE	#3B8282	25	1365	2026-10-28 06:30:05.630392+00	2026-10-28 06:30:17.85855+00
c8uDD5R7u	Server Admin	#3B8282	439.8763533913185	1548.306034527134	2026-10-27 03:15:11.744606+00	2026-10-27 03:15:36.666519+00
iespWzNkY	Server Admin	#3B8282	25	1365	2026-10-26 10:26:25.219161+00	2026-10-26 10:26:34.112269+00
TsPwXWzG6	HEHE	#3B8282	25	1365	2026-10-26 10:26:25.68223+00	2026-10-26 10:26:34.185542+00
lCV3tKfv9	HEHE	#3B8282	25	1365	2026-10-28 09:03:14.125139+00	2026-10-28 09:03:18.226171+00
UMABjlzL6	HEHE	#3B8282	25	1365	2026-10-28 09:03:18.966635+00	2026-10-28 09:03:19.616408+00
p0wgm7VOe	HEHE	#3B8282	25	1365	2026-10-28 06:02:54.101547+00	2026-10-28 06:03:09.460135+00
_9L_B5c1I	HEHE	#3B8282	490.7766786666267	565.6913894913225	2026-10-28 09:03:21.049705+00	2026-10-28 09:03:57.864506+00
LoiS_V0rD	Server Admin	#3B8282	400.26586012876305	1285.5385101458276	2026-10-28 09:10:42.36237+00	2026-10-28 09:56:11.544342+00
6KiiryqTT	Server Admin	#3B8282	25	1365	2026-10-28 09:56:11.849659+00	2026-10-28 09:56:12.637743+00
p4ajwfKxB	Server Admin	#3B8282	25	1365	2026-10-28 09:58:20.584737+00	2026-10-28 09:58:22.997879+00
FrSC8qWJE	Server Admin	#3B8282	257.5927824146008	1020.3280640439289	2026-10-28 10:21:02.626243+00	2026-10-28 10:22:59.83125+00
wZLWpt4II	HEHE	#3B8282	25	1365	2026-10-28 09:58:24.7303+00	2026-10-28 09:58:50.923128+00
eqxzAJCYO	Server Admin	#3B8282	25	1365	2026-10-28 09:58:50.928491+00	2026-10-28 09:58:59.984678+00
9nNSf5DTL	HEHE	#3B8282	25	1365	2026-10-28 09:58:51.959899+00	2026-10-28 09:59:01.657334+00
1JBhQMMGJ	Server Admin	#3B8282	25	1365	2026-10-28 09:59:00.188611+00	2026-10-28 09:59:10.314878+00
JyDSpXeYt	Server Admin	#3B8282	25	1365	2026-10-28 09:59:10.586657+00	2026-10-28 09:59:16.675907+00
3SVrFrLZh	HEHE	#3B8282	25	1365	2026-10-28 09:59:11.945911+00	2026-10-28 09:59:16.886305+00
R5sx_i-Ko	Server Admin	#3B8282	816.3390107712529	1347.8158937071885	2026-10-28 06:05:01.909391+00	2026-10-28 07:19:27.543193+00
97LHQ1Bq5	Server Admin	#3B8282	178.4016048496613	127.85664571277377	2026-10-28 08:30:52.243092+00	2026-10-28 08:56:51.539268+00
-w-htoTQw	Server Admin	#3B8282	25	1365	2026-10-28 08:57:51.076288+00	2026-10-28 08:58:06.02202+00
gJMi315Z_	HEHE	#3B8282	1225	915	2026-10-28 09:32:11.319407+00	2026-10-28 09:32:13.457352+00
hbTInCV_3	Server Admin	#3B8282	25	1365	2026-10-28 08:58:06.362905+00	2026-10-28 08:58:39.118759+00
T6XP0pyqv	HEHE	#3B8282	25	1365	2026-10-28 08:58:07.58905+00	2026-10-28 08:58:40.675937+00
YFxayD5PY	Server Admin	#3B8282	25	1365	2026-10-28 08:58:39.48727+00	2026-10-28 08:58:47.428886+00
uUs-AupBB	Server Admin	#3B8282	25	1365	2026-10-28 08:58:47.681562+00	2026-10-28 08:58:53.981138+00
RiZaCsQ_w	Server Admin	#3B8282	25	1365	2026-10-28 08:58:54.263254+00	2026-10-28 08:59:24.215087+00
0bktFJdEj	HEHE	#3B8282	25	1365	2026-10-28 08:58:55.652454+00	2026-10-28 08:59:25.7108+00
TmskgNJgT	Server Admin	#3B8282	25	1365	2026-10-28 08:59:24.461084+00	2026-10-28 08:59:28.901227+00
hAiAKa5UU	HEHE	#3B8282	25	1365	2026-10-28 08:59:27.147619+00	2026-10-28 08:59:29.890641+00
XfAzOdCH1	HEHE	#3B8282	25	1365	2026-10-28 09:03:20.21729+00	2026-10-28 09:03:20.312831+00
0H1DKCjo4	HEHE	#3B8282	25	1365	2026-10-28 08:57:52.010928+00	2026-10-28 08:58:06.815056+00
9RU8jXcBB	HEHE	#3B8282	25	1365	2026-10-26 10:26:34.751968+00	2026-10-26 10:26:57.203628+00
fzmLPnac_	Server Admin	#3B8282	25	1365	2026-10-26 10:26:57.28027+00	2026-10-26 10:27:01.083495+00
rYk7Hnrsh	HEHE	#3B8282	25	1365	2026-10-26 10:26:57.874089+00	2026-10-26 10:27:01.189592+00
0uW1oE_tw	HEHE	#3B8282	293.15814105164475	1372.486830689954	2026-10-28 09:11:14.477771+00	2026-10-28 09:11:54.546227+00
sOvYIdhmW	HEHE	#3B8282	521.6699710299109	1334.9749979073767	2026-10-28 09:32:13.56972+00	2026-10-28 09:56:12.330504+00
UEb0tJImV	HEHE	#3B8282	25	1365	2026-10-28 09:56:14.715882+00	2026-10-28 09:56:14.715882+00
tS_K6Wnqn	HEHE	#3B8282	336.99562122071524	1165.3969578439915	2026-10-28 10:21:27.025187+00	2026-10-28 10:22:59.915291+00
WEDS0dUy0	HEHE	#3B8282	25	1365	2026-10-28 08:33:13.059837+00	2026-10-28 08:40:46.067219+00
y4VMDhftw	Server Admin	#3B8282	771.5519484024475	1518.484327581371	2026-10-28 05:42:00.072091+00	2026-10-28 05:57:05.098462+00
H6G8VxXMF	Server Admin	#3B8282	25	1365	2026-10-28 06:03:09.657003+00	2026-10-28 06:03:17.472509+00
TptroorQw	Server Admin	#3B8282	25	1365	2026-10-28 06:03:17.602498+00	2026-10-28 06:03:27.476256+00
anU4X4qzr	HEHE	#3B8282	25	1365	2026-10-28 06:03:29.867595+00	2026-10-28 06:03:35.399503+00
pA2pPfsu0	Server Admin	#3B8282	25	1365	2026-10-28 06:03:27.711656+00	2026-10-28 06:03:35.466497+00
VzPcOooeK	Server Admin	#3B8282	1674.9450460455685	962.5396855796724	2026-10-26 13:04:45.335008+00	2026-10-26 13:22:33.759501+00
rw9sdZ5_8	Server Admin	#3B8282	213.41356774809316	1308.9264322519066	2026-10-28 10:01:09.953085+00	2026-10-28 10:18:17.449203+00
Un4s6CBRE	HEHE	#3B8282	25	1365	2026-10-28 09:56:25.634056+00	2026-10-28 09:56:27.978211+00
qNlVfYvk2	HEHE	#3B8282	25	1365	2026-10-28 08:58:41.625787+00	2026-10-28 08:58:47.83234+00
L3gD_GleJ	Server Admin	#3B8282	25	1365	2026-10-26 10:26:34.248057+00	2026-10-26 10:26:57.10673+00
20qFTpEx8	Server Admin	#3B8282	25	1365	2026-10-28 09:56:22.944668+00	2026-10-28 09:56:27.97834+00
5ffHXe_wJ	HEHE	#3B8282	1225	915	2026-10-28 08:40:46.246651+00	2026-10-28 08:41:08.86019+00
jrIPlm0tE	HEHE	#3B8282	25	1365	2026-10-28 08:58:48.908599+00	2026-10-28 08:58:54.812523+00
chqJdzHsl	HEHE	#3B8282	25	1365	2026-10-28 10:05:05.311467+00	2026-10-28 10:05:16.371755+00
Z44VtEfuq	Server Admin	#3B8282	358.1587935070799	1312.417775772483	2026-10-28 10:23:00.025021+00	2026-10-28 10:23:21.241555+00
oXrRyuUgq	HEHE	#3B8282	25	1365	2026-10-28 08:59:30.967839+00	2026-10-28 09:03:10.794096+00
fQeamjn-s	Server Admin	#3B8282	25	1365	2026-10-28 08:59:29.140258+00	2026-10-28 09:03:57.864506+00
tlEOGNPye	HEHE	#3B8282	290.6442586400539	1368.6670046280587	2026-10-28 09:04:01.818461+00	2026-10-28 09:10:23.006645+00
yzztYtTr4	HEHE	#3B8282	170.77057031182633	1512.477188294849	2026-10-28 05:51:09.8871+00	2026-10-28 06:01:05.134018+00
GlWtJiwhc	HEHE	#3B8282	25	1365	2026-10-28 06:03:10.612397+00	2026-10-28 06:03:17.390975+00
9dSXj6RX9	HEHE	#3B8282	1050.4941309459118	972.4727015604204	2026-10-28 09:11:54.724209+00	2026-10-28 09:13:58.946176+00
6jW2vfX3b	Server Admin	#3B8282	533.6175326182594	741.5929554613008	2026-10-26 13:22:33.96277+00	2026-10-26 13:37:05.924195+00
kZGFqZZqV	Server Admin	#3B8282	573.2527325241014	1060.078509829797	2026-10-28 10:23:21.405339+00	2026-10-28 10:34:27.546344+00
1_spz74a7	HEHE	#3B8282	568.8592396226986	709.0058464804121	2026-10-28 10:23:20.531335+00	2026-10-28 10:34:27.546352+00
WDPI0X9E7	Server Admin	#3B8282	25	1365	2026-10-28 09:04:39.929094+00	2026-10-28 09:04:41.717877+00
hycYgafr9	Server Admin	#3B8282	25	1365	2026-10-28 09:56:53.828377+00	2026-10-28 09:56:56.929129+00
zAlxy2Gv_	Server Admin	#3B8282	25	1365	2026-10-26 10:27:01.238727+00	2026-10-26 10:27:30.122313+00
BkYiLiUNb	HEHE	#3B8282	25	1365	2026-10-28 10:23:00.592347+00	2026-10-28 10:23:19.756222+00
SKPr54A1e	Server Admin	#3B8282	25	1365	2026-10-28 09:56:57.068516+00	2026-10-28 09:57:06.798464+00
-sI29JLu3	Server Admin	#3B8282	25	1365	2026-10-26 10:27:30.255446+00	2026-10-26 10:27:38.096801+00
6Ochb5mRM	HEHE	#3B8282	25	1365	2026-10-28 09:56:59.248329+00	2026-10-28 09:57:06.980851+00
t-O43e0Li	Server Admin	#3B8282	25	1365	2026-10-26 10:27:38.215827+00	2026-10-26 10:27:47.10525+00
sS39yyNJY	HEHE	#3B8282	25	1365	2026-10-26 10:27:37.588593+00	2026-10-26 10:27:47.284054+00
cnwThGY-d	HEHE	#3B8282	25	1365	2026-10-26 10:27:47.999632+00	2026-10-26 10:28:18.187035+00
ZGIMO434V	HEHE	#3B8282	25	1365	2026-10-28 09:57:07.881367+00	2026-10-28 09:57:59.002028+00
L5EMl3cpT	HEHE	#3B8282	25	1365	2026-10-28 10:15:58.636398+00	2026-10-28 10:16:10.568127+00
b8aU3qmyW	HEHE	#3B8282	25	1365	2026-10-28 10:18:10.795329+00	2026-10-28 10:18:59.312616+00
S7f9iUyke	Server Admin	#3B8282	764.9599999999997	1518.4710937500001	2026-10-28 05:57:05.352953+00	2026-10-28 06:01:05.134018+00
-RxrMvWac	Server Admin	#3B8282	25	1365	2026-10-28 10:18:58.89129+00	2026-10-28 10:19:21.552552+00
wtZb8yXkt	HEHE	#3B8282	25	1365	2026-10-28 10:19:00.650702+00	2026-10-28 10:19:22.176917+00
HCiRwNFQr	Server Admin	#3B8282	25	1365	2026-10-28 10:19:21.717465+00	2026-10-28 10:19:43.563275+00
AFP4GtvMA	HEHE	#3B8282	25	1365	2026-10-28 10:19:22.895863+00	2026-10-28 10:19:44.183439+00
RmN-3yJdk	Server Admin	#3B8282	25	1365	2026-10-28 10:19:43.724161+00	2026-10-28 10:19:54.453581+00
wNrN7fdFL	Server Admin	#3B8282	380.2882034110601	1372.4995001734478	2026-10-28 09:04:41.876372+00	2026-10-28 09:10:22.538086+00
tCisl6coQ	Server Admin	#3B8282	25	1365	2026-10-28 10:19:54.609497+00	2026-10-28 10:20:11.01379+00
AzHmGylCu	HEHE	#3B8282	25	1365	2026-10-28 10:19:57.088867+00	2026-10-28 10:20:11.157793+00
97NBH9XrU	Server Admin	#3B8282	25	1365	2026-10-28 10:20:11.178686+00	2026-10-28 10:20:17.090201+00
PgiKLSIbq	HEHE	#3B8282	25	1365	2026-10-28 10:20:11.777335+00	2026-10-28 10:20:18.117241+00
HaJ9yXEX_	HEHE	#3B8282	25	1365	2026-10-28 10:20:18.859497+00	2026-10-28 10:20:21.752593+00
cMX3SDAkG	Server Admin	#3B8282	25	1365	2026-10-28 10:20:17.263018+00	2026-10-28 10:20:21.752593+00
vPzYEraH-	HEHE	#3B8282	25	1365	2026-10-28 08:41:09.01205+00	2026-10-28 08:56:52.133653+00
Rzv775QCF	HEHE	#3B8282	687.3489588005267	1191.0247487795339	2026-10-28 09:13:59.115607+00	2026-10-28 09:32:11.102077+00
ckL_9BySX	HEHE	#3B8282	25	1365	2026-10-28 09:56:55.486176+00	2026-10-28 09:56:57.98043+00
88vzzgre_	Server Admin	#3B8282	25	1365	2026-10-28 06:02:47.853617+00	2026-10-28 06:02:53.450661+00
z5fhB3pHk	HEHE	#3B8282	25	1365	2026-10-26 10:27:01.606518+00	2026-10-26 10:27:30.267433+00
IvGa49SA9	Server Admin	#3B8282	117.3568045926681	524.5988204073324	2026-10-28 09:10:22.774381+00	2026-10-28 09:10:38.702875+00
l2RiJhLGm	HEHE	#3B8282	25	1365	2026-10-28 06:03:18.281204+00	2026-10-28 06:03:28.950817+00
MrLOgLPKM	Server Admin	#3B8282	25	1365	2026-10-28 06:03:35.598318+00	2026-10-28 06:03:35.598318+00
c99LK9KJn	HEHE	#3B8282	25	1365	2026-10-26 10:27:30.935335+00	2026-10-26 10:27:37.220125+00
qHv5c1tzU	HEHE	#3B8282	25	1365	2026-10-28 06:03:36.319204+00	2026-10-28 06:03:36.319204+00
yrZTmkcbJ	Server Admin	#3B8282	25	1365	2026-10-26 10:27:47.228473+00	2026-10-26 10:28:18.126675+00
L6jUqbZjK	Server Admin	#3B8282	25	1365	2026-10-28 09:57:06.970354+00	2026-10-28 09:57:58.618065+00
FRDQ3RDC9	Server Admin	#3B8282	25	1365	2026-10-28 09:57:58.832005+00	2026-10-28 09:58:14.938142+00
s3fKh-FqD	HEHE	#3B8282	25	1365	2026-10-28 09:58:00.31604+00	2026-10-28 09:58:15.988138+00
scRv23rtU	Server Admin	#3B8282	25	1365	2026-10-28 09:58:15.251269+00	2026-10-28 09:58:17.320267+00
opNX0qQ7N	HEHE	#3B8282	25	1365	2026-10-28 10:17:32.934418+00	2026-10-28 10:18:08.858156+00
2JNUDgd-n	Server Admin	#3B8282	209.0641486985347	1372.485617970208	2026-10-28 10:18:17.764268+00	2026-10-28 10:18:58.653364+00
pXnn7me1L	HEHE	#3B8282	25	1365	2026-10-28 10:19:45.071904+00	2026-10-28 10:19:55.878782+00
bL-3mlXxC	Server Admin	#3B8282	438.4599585627568	1572.7394363016804	2026-10-26 13:00:36.043449+00	2026-10-26 13:03:36.863102+00
tCLAbVPFS	HEHE	#3B8282	25	1365	2026-10-28 06:02:48.98683+00	2026-10-28 06:02:53.403765+00
EOlnB7te3	Server Admin	#3B8282	25	1365	2026-10-26 10:28:18.320281+00	2026-10-26 10:28:26.126537+00
28GfMeTjt	HEHE	#3B8282	25	1365	2026-10-28 09:58:17.027429+00	2026-10-28 09:58:18.720102+00
h2ulZi6NG	HEHE	#3B8282	25	1365	2026-10-26 10:28:18.913584+00	2026-10-26 10:28:26.250696+00
XshFtWWF_	HEHE	#3B8282	25	1365	2026-10-28 09:10:24.065456+00	2026-10-28 09:10:38.702875+00
M3FHjgO6M	Server Admin	#3B8282	25	1365	2026-10-26 10:28:26.244792+00	2026-10-26 10:28:33.102688+00
2eu0EpnDi	HEHE	#3B8282	25	1365	2026-10-26 10:28:26.894389+00	2026-10-26 10:28:33.215834+00
ErH5NkQ-G	Server Admin	#3B8282	25	1365	2026-10-28 06:02:53.619392+00	2026-10-28 06:03:09.505186+00
ENIPMOhJ4	Server Admin	#3B8282	25	1365	2026-10-28 09:58:17.46939+00	2026-10-28 09:58:20.434571+00
JY3Rq63TU	HEHE	#3B8282	25	1365	2026-10-28 09:58:19.416481+00	2026-10-28 09:58:21.281184+00
cn9Hs4BO_	Server Admin	#3B8282	25	1365	2026-10-26 10:28:33.224932+00	2026-10-26 10:28:42.111584+00
67dM5rlkS	HEHE	#3B8282	25	1365	2026-10-26 10:28:33.699378+00	2026-10-26 10:28:42.387102+00
C0yrVTw0u	HEHE	#3B8282	25	1365	2026-10-28 09:58:22.134753+00	2026-10-28 09:58:23.961999+00
hp_GQ7DxR	Server Admin	#3B8282	25	1365	2026-10-28 09:58:23.167289+00	2026-10-28 09:58:50.765778+00
rpsAFWOs8	HEHE	#3B8282	25	1365	2026-10-26 10:28:43.026144+00	2026-10-26 10:28:56.201151+00
UbhTJ8HYK	Server Admin	#3B8282	25	1365	2026-10-26 10:28:42.234986+00	2026-10-26 10:28:57.085473+00
BJyf0hFMy	HEHE	#3B8282	25	1365	2026-10-28 09:59:03.074093+00	2026-10-28 09:59:11.122457+00
CJjSOSLio	Server Admin	#3B8282	25	1365	2026-10-26 10:28:57.212312+00	2026-10-26 10:29:02.101217+00
ApTc3lj4p	HEHE	#3B8282	25	1365	2026-10-26 10:28:56.728667+00	2026-10-26 10:29:02.219444+00
pOS5Q5ByL	Server Admin	#3B8282	25	1365	2026-10-28 09:59:16.834245+00	2026-10-28 09:59:27.113494+00
Qm-kgv5ld	HEHE	#3B8282	25	1365	2026-10-28 09:59:18.470286+00	2026-10-28 09:59:27.919957+00
J60zHsYjR	Server Admin	#3B8282	25	1365	2026-10-26 10:29:02.208034+00	2026-10-26 10:29:23.152646+00
R-xYBX7CR	HEHE	#3B8282	25	1365	2026-10-26 10:29:02.664675+00	2026-10-26 10:29:23.194674+00
yCT3RB7C1	Server Admin	#3B8282	25	1365	2026-10-28 09:59:27.273625+00	2026-10-28 09:59:40.918936+00
fCsyU1ZQ8	HEHE	#3B8282	25	1365	2026-10-26 10:29:23.702375+00	2026-10-26 10:29:30.217308+00
y2BWo8VcS	Server Admin	#3B8282	25	1365	2026-10-26 10:29:23.288537+00	2026-10-26 10:29:31.947552+00
dCA_P-ndg	HEHE	#3B8282	25	1365	2026-10-28 09:59:29.308436+00	2026-10-28 09:59:42.324636+00
r_nv71r0U	Server Admin	#3B8282	25	1365	2026-10-26 10:29:32.074087+00	2026-10-26 10:29:43.112448+00
9A6i2d6aQ	HEHE	#3B8282	25	1365	2026-10-26 10:29:30.796811+00	2026-10-26 10:29:43.207563+00
Ea4U3q_zT	HEHE	#3B8282	25	1365	2026-10-28 09:59:43.498578+00	2026-10-28 09:59:52.040181+00
p7hv2iE7i	Server Admin	#3B8282	25	1365	2026-10-28 09:59:41.072148+00	2026-10-28 09:59:52.040175+00
hYkoXWxVa	Server Admin	#3B8282	25	1365	2026-10-26 10:29:43.247272+00	2026-10-26 10:29:49.107332+00
0SpwhL-4x	HEHE	#3B8282	25	1365	2026-10-26 10:29:43.82252+00	2026-10-26 10:29:49.210532+00
DghXriBhz	HEHE	#3B8282	25	1365	2026-10-29 03:00:25.93498+00	2026-10-29 03:00:27.690918+00
ibLJGQNbz	HEHE	#3B8282	25	1365	2026-10-29 03:00:36.104039+00	2026-10-29 03:00:36.104039+00
RtOYLb8k4	Dauss	#3B8282	1055.8210644286241	881.7292360821533	2026-11-17 08:58:11.474093+00	2026-11-17 08:58:11.474093+00
TTtf9CY7A	Admin	#3B8282	25	1365	2026-10-29 07:44:24.43448+00	2026-10-29 07:44:31.461774+00
1KkAgU4Sd	Admin	#3B8282	25	1365	2026-10-29 07:44:31.708613+00	2026-10-29 07:45:29.404346+00
oNVcEmjRH	Admin	#3B8282	342.1571161360116	1269.4291247202204	2026-10-29 01:48:14.78088+00	2026-10-29 02:08:47.502919+00
qrqbdR5Gx	Admin	#3B8282	25	1365	2026-10-29 02:10:07.770047+00	2026-10-29 02:10:24.283832+00
PFiOihi1m	Admin	#3B8282	25	1365	2026-10-29 02:10:24.679474+00	2026-10-29 02:10:29.271611+00
AAz6THqeP	Admin	#3B8282	25	1365	2026-10-29 02:10:29.596557+00	2026-10-29 02:10:37.015274+00
QZWVahs7Q	Server Admin	#3B8282	666.3546518901521	1203.3397837780808	2026-10-28 16:58:34.694152+00	2026-10-28 17:01:25.083939+00
GmD-DCefH	HEHE	#3B8282	1055.5765113749105	1521.483867174205	2026-10-29 03:41:12.343321+00	2026-10-29 04:24:38.476034+00
KAruQh-t1	HEHE	#3B8282	25	1365	2026-10-29 02:12:32.678663+00	2026-10-29 02:12:52.663628+00
mKIsXgGKt	Admin	#3B8282	25	1365	2026-10-29 02:12:52.581224+00	2026-10-29 02:12:55.272752+00
ph8yON8L_	Admin	#3B8282	25	1365	2026-10-29 04:24:38.674569+00	2026-10-29 04:24:44.791222+00
ag0T4fQOU	HEHE	#3B8282	25	1365	2026-10-29 04:28:38.003251+00	2026-10-29 04:28:44.037273+00
2HfXiuo2P	Admin	#3B8282	25	1365	2026-10-29 02:12:55.59332+00	2026-10-29 02:13:06.280397+00
Tt6wr-uDJ	HEHE	#3B8282	25	1365	2026-10-29 02:13:06.13113+00	2026-10-29 02:13:09.657859+00
BMGm9CMx2	Admin	#3B8282	25	1365	2026-10-29 04:36:25.928652+00	2026-10-29 04:36:37.145768+00
L7mPM6vca	Admin	#3B8282	25	1365	2026-10-29 02:13:09.583666+00	2026-10-29 02:13:19.271441+00
7qf6RJeAG	HEHE	#3B8282	25	1365	2026-10-29 04:36:37.163428+00	2026-10-29 04:36:38.188195+00
CwrPI-aP2	HEHE	#3B8282	25	1365	2026-10-29 02:13:19.016098+00	2026-10-29 02:13:40.723062+00
ur8J1U1pM	HEHE	#3B8282	25	1365	2026-10-29 04:54:20.947318+00	2026-10-29 04:54:32.17776+00
7Te3WmYdB	Admin	#3B8282	25	1365	2026-10-29 02:13:40.538111+00	2026-10-29 02:13:45.273829+00
tLOKtV010	Admin	#3B8282	25	1365	2026-10-29 02:13:45.616483+00	2026-10-29 02:13:58.276156+00
wjsBFmKM6	Admin	#3B8282	25	1365	2026-10-29 02:14:08.703878+00	2026-10-29 02:14:15.270112+00
ZsFQ97zkP	Admin	#3B8282	1077.9152655299706	1521.4727348687854	2026-10-29 09:47:24.450612+00	2026-10-29 09:51:17.038986+00
n_OnVQTCc	Admin	#3B8282	25	1365	2026-10-29 02:14:15.573082+00	2026-10-29 02:14:17.279404+00
FINfIGN5j	Admin	#3B8282	25	1365	2026-10-29 09:51:21.539499+00	2026-10-29 09:51:21.539499+00
8f7lXO-jj	Admin	#3B8282	25	1365	2026-10-29 09:52:38.526238+00	2026-10-29 09:52:42.521294+00
lwFHehZax	HEHE	#3B8282	25	1365	2026-10-29 02:14:18.259353+00	2026-10-29 02:14:36.389841+00
3VGY8l4r0	HEHE	#3B8282	25	1365	2026-10-29 09:54:07.05135+00	2026-10-29 09:54:13.269597+00
eojfHjCyv	HEHE	#3B8282	790.4419791932133	1615.966164027089	2026-10-29 09:55:53.307649+00	2026-10-29 10:04:01.485671+00
UZVIlZ6t5	HEHE	#3B8282	1115.763296702564	1577.506917424494	2026-10-29 07:46:06.627849+00	2026-10-29 09:22:19.30678+00
ry2rwT8aq	Admin	#3B8282	25	1365	2026-10-29 09:23:01.876361+00	2026-10-29 09:23:04.479514+00
Mvw4frBIm	Admin	#3B8282	25	1365	2026-10-29 09:26:05.438683+00	2026-10-29 09:26:11.592761+00
MtDfxkzmZ	HEHE	#3B8282	25	1365	2026-10-29 05:10:09.058311+00	2026-10-29 05:10:34.599677+00
dnVzcoTGF	Admin	#3B8282	25	1365	2026-10-29 09:27:43.097355+00	2026-10-29 09:27:49.407263+00
W1kdFOots	Admin	#3B8282	25	1365	2026-10-29 09:28:16.876239+00	2026-10-29 09:29:05.467552+00
HQ5ZlsEtn	Admin	#3B8282	25	1365	2026-10-29 09:29:09.904348+00	2026-10-29 09:29:11.412585+00
jPvqOnO18	HEHE	#3B8282	25	1365	2026-10-29 09:29:12.752101+00	2026-10-29 09:29:15.297219+00
8CEPkE_VW	HEHE	#3B8282	25	1365	2026-10-29 09:29:28.667892+00	2026-10-29 09:29:34.279764+00
6nA8bzusS	Admin	#3B8282	25	1365	2026-10-29 09:29:34.952569+00	2026-10-29 09:29:37.446731+00
2eBAgvLDQ	HEHE	#3B8282	25	1365	2026-10-29 09:30:48.857951+00	2026-10-29 09:30:52.246364+00
gOohGnIvF	Admin	#3B8282	25	1365	2026-10-29 09:32:20.855229+00	2026-10-29 09:32:28.401324+00
AmvnsipMa	HEHE	#3B8282	25	1365	2026-10-29 09:33:18.779212+00	2026-10-29 09:33:21.203043+00
lcqwh8Chf	HEHE	#3B8282	25	1365	2026-10-29 09:33:21.569084+00	2026-10-29 09:33:51.234761+00
iqhhbpMWr	HEHE	#3B8282	25	1365	2026-10-29 09:34:44.860458+00	2026-10-29 09:34:51.218371+00
yTkCYkP3p	Admin	#3B8282	25	1365	2026-10-29 09:36:09.98925+00	2026-10-29 09:36:40.745342+00
pqmWIzc_6	Shadow Knight	#3B8282	1105.2645555380673	422.458776272827	2026-10-29 01:56:08.203391+00	2026-10-29 02:00:13.262173+00
q3jfqZdmD	Admin	#3B8282	63.66	1372.3320314894324	2026-10-28 17:04:47.911123+00	2026-10-28 17:19:15.311636+00
p92pRI7N8	HEHE	#3B8282	25	1365	2026-10-29 03:07:08.639033+00	2026-10-29 03:25:08.404121+00
Hs73lgCLO	HEHE	#3B8282	1225	915	2026-10-29 01:34:12.085963+00	2026-10-29 01:34:17.14364+00
42iXfa1lH	Admin	#3B8282	252.5	1365	2026-10-29 03:26:36.646785+00	2026-10-29 03:26:41.893053+00
syrupmbzV	HEHE	#3B8282	25	1365	2026-11-13 06:31:15.895475+00	2026-11-13 06:31:17.442746+00
cvGyvsyh4	Admin	#3B8282	25	1365	2026-10-29 03:00:25.989855+00	2026-10-29 03:00:27.238714+00
3v2S4l6Fj	Server Admin	#3B8282	472.44147107970065	1039.014660160724	2026-10-28 16:55:59.020635+00	2026-10-28 16:56:52.563036+00
xmS39wFxG	HEHE	#3B8282	25	1365	2026-10-29 04:24:40.043895+00	2026-10-29 04:24:44.791235+00
ZlB7h5exw	Admin	#3B8282	25	1365	2026-10-29 03:02:47.357105+00	2026-10-29 03:02:56.220894+00
evtQWrBzW	Admin	#3B8282	25	1365	2026-10-29 04:28:38.477633+00	2026-10-29 04:28:44.037319+00
bv5ZAwLVy	Admin	#3B8282	25	1365	2026-10-29 03:02:56.775542+00	2026-10-29 03:02:58.213814+00
DgeKoT3Ta	HEHE	#3B8282	1068.5543495751592	1521.4697716401784	2026-10-29 04:36:26.059605+00	2026-10-29 04:36:36.711732+00
TpNwPOsqY	Admin	#3B8282	25	1365	2026-10-29 01:42:33.487902+00	2026-10-29 01:45:22.656079+00
gwKfFlsWj	HEHE	#3B8282	25	1365	2026-10-29 01:44:21.19975+00	2026-10-29 01:45:22.656079+00
kdo8G4bo3	Admin	#3B8282	25	1365	2026-10-29 04:36:37.463234+00	2026-10-29 04:36:38.188191+00
d_dWvaQ6H	Admin	#3B8282	171.68935467401445	1466.0632742202076	2026-10-28 17:02:41.276629+00	2026-10-28 17:03:43.423374+00
k2ndhw3Ps	HEHE	#3B8282	1102.5081684312763	1577.4851705331566	2026-10-29 05:50:52.436204+00	2026-10-29 07:44:24.126528+00
KA13Y9kfE	HEHE	#3B8282	25	1365	2026-10-29 07:44:25.051774+00	2026-10-29 07:44:32.181312+00
64VYncKCa	HEHE	#3B8282	1373.8800000000003	1511.4971354166664	2026-10-29 10:13:35.572787+00	2026-10-29 10:28:51.559995+00
HavdzjO2B	HEHE	#3B8282	25	1365	2026-10-29 01:48:22.311285+00	2026-10-29 02:08:47.502914+00
pXqxO4eYM	HEHE	#3B8282	25	1365	2026-10-29 02:10:25.793935+00	2026-10-29 02:10:29.721664+00
WmuaGfrme	Admin	#3B8282	473.7168742188836	1273.8017502121565	2026-10-28 17:40:02.207385+00	2026-10-28 17:41:08.83934+00
u_MNzrKWm	HEHE	#3B8282	25	1365	2026-10-29 02:10:30.158046+00	2026-10-29 02:10:37.015337+00
pjw7cRO4j	HEHE	#3B8282	25	1365	2026-10-29 01:34:07.685891+00	2026-10-29 01:34:11.976376+00
_2vW-6hUt	Admin	#3B8282	25	1365	2026-10-29 02:12:32.878986+00	2026-10-29 02:12:52.276506+00
k6Jsqd3f3	HEHE	#3B8282	25	1365	2026-10-29 07:44:32.492051+00	2026-10-29 07:45:29.178484+00
w0zXiRgAp	HEHE	#3B8282	25	1365	2026-10-29 02:12:53.00311+00	2026-10-29 02:12:55.698019+00
b6HpZ7XLD	Admin	#3B8282	153.5104332049602	1500.913076890055	2026-10-29 02:16:58.226015+00	2026-10-29 02:37:45.879976+00
RVFQON_5F	HEHE	#3B8282	25	1365	2026-10-29 02:12:56.033047+00	2026-10-29 02:13:05.710556+00
BAysHUjhb	Admin	#3B8282	25	1365	2026-10-29 02:13:06.594717+00	2026-10-29 02:13:09.272007+00
lQNF2l7_K	HEHE	#3B8282	25	1365	2026-10-29 02:13:10.009278+00	2026-10-29 02:13:18.65925+00
4-eHx7H6Y	Admin	#3B8282	25	1365	2026-10-29 02:13:19.575342+00	2026-10-29 02:13:40.281651+00
CSuQ26Cpe	HEHE	#3B8282	25	1365	2026-10-29 02:13:41.155669+00	2026-10-29 02:13:45.675257+00
Q2ze0ijGH	HEHE	#3B8282	25	1365	2026-10-29 02:13:46.004132+00	2026-10-29 02:13:58.650965+00
KTG6tNmeI	HEHE	#3B8282	25	1365	2026-10-29 02:14:09.176434+00	2026-10-29 02:14:15.682943+00
4z9v7lhnr	HEHE	#3B8282	1383.4880730134153	1594.2465006969908	2026-10-29 10:28:52.325254+00	2026-10-29 10:31:13.362284+00
a7ZeC3El4	HEHE	#3B8282	25	1365	2026-10-29 02:14:16.034331+00	2026-10-29 02:14:17.687416+00
-ylf_nb08	Admin	#3B8282	25	1365	2026-10-29 02:14:19.170172+00	2026-10-29 02:14:21.048564+00
8w3KiakZQ	Admin	#3B8282	25	1365	2026-10-29 02:14:17.823493+00	2026-10-29 02:14:36.389842+00
s4tO9rmXN	Admin	#3B8282	1067.450147632487	1521.48439552021	2026-10-29 09:37:30.460177+00	2026-10-29 09:47:24.079636+00
Z8xNFeoAo	Admin	#3B8282	25	1365	2026-10-29 09:51:18.140356+00	2026-10-29 09:51:20.439931+00
0AtG0kMYd	HEHE	#3B8282	25	1365	2026-10-29 09:52:26.070832+00	2026-10-29 09:52:37.218688+00
gKJlE01pK	HEHE	#3B8282	25	1365	2026-10-29 09:52:42.944224+00	2026-10-29 09:52:50.18235+00
FxCe_RdaX	Admin	#3B8282	25	1365	2026-10-29 09:52:51.376786+00	2026-10-29 09:52:54.515141+00
4Zft7fk0d	Admin	#3B8282	1085.4889436395736	1279.9598574437932	2026-10-29 09:55:42.789883+00	2026-10-29 09:55:54.88711+00
zKV0LxDg8	Admin	#3B8282	25	1365	2026-10-29 10:04:53.414504+00	2026-10-29 10:04:53.414504+00
mbp5ey9Jy	HEHE	#3B8282	25	1365	2026-10-29 10:04:54.406127+00	2026-10-29 10:04:54.406127+00
x_ExgqSP8	Admin	#3B8282	25	1365	2026-10-29 10:05:26.123173+00	2026-10-29 10:05:55.47328+00
BnLk-qFfa	Admin	#3B8282	1032.6266441180912	1594.1374086874782	2026-10-29 07:46:06.889533+00	2026-10-29 09:22:19.306822+00
zztZhhTo7	HEHE	#3B8282	25	1365	2026-10-29 10:05:27.519532+00	2026-10-29 10:05:56.300371+00
UWSl35HqH	Admin	#3B8282	25	1365	2026-10-29 02:37:46.372744+00	2026-10-29 02:43:09.63615+00
X5zZb-iey	HEHE	#3B8282	25	1365	2026-10-29 02:18:19.173194+00	2026-10-29 02:43:09.809409+00
i-PvnmhFG	HEHE	#3B8282	25	1365	2026-10-29 09:23:02.110132+00	2026-10-29 09:23:04.240115+00
1zqHGOzXd	HEHE	#3B8282	25	1365	2026-10-29 09:23:04.780782+00	2026-10-29 09:23:11.222343+00
JaogoFUM3	HEHE	#3B8282	25	1365	2026-10-29 09:26:45.032965+00	2026-10-29 09:26:45.032965+00
LS-0n3IAB	Admin	#3B8282	25	1365	2026-10-29 09:27:49.738057+00	2026-10-29 09:27:52.410319+00
-V4oC4Enq	Admin	#3B8282	25	1365	2026-10-29 09:29:05.982599+00	2026-10-29 09:29:09.423753+00
5ThJwEAq6	Admin	#3B8282	25	1365	2026-10-29 09:29:19.040194+00	2026-10-29 09:29:21.446422+00
eWBuiDSIh	Admin	#3B8282	25	1365	2026-10-29 09:29:29.060687+00	2026-10-29 09:29:34.4638+00
p4U4FidxZ	HEHE	#3B8282	25	1365	2026-10-29 10:05:56.658779+00	2026-10-29 10:06:12.269582+00
qkJEtFJnm	HEHE	#3B8282	25	1365	2026-10-29 09:29:37.593203+00	2026-10-29 09:29:43.207537+00
_VtUE8nLC	Admin	#3B8282	25	1365	2026-10-29 10:05:55.724843+00	2026-10-29 10:06:12.381734+00
O3ciBBDCP	Admin	#3B8282	25	1365	2026-10-29 09:30:24.870725+00	2026-10-29 09:30:33.496381+00
Esb7IZ7cz	Admin	#3B8282	490.15363692280823	1033.631307850734	2026-10-29 01:32:01.696356+00	2026-10-29 01:42:14.04716+00
efb2yNTlG	HEHE	#3B8282	463.5115729200146	336.11002897008825	2026-10-29 01:34:17.241186+00	2026-10-29 01:42:14.739661+00
gWj3G9RvE	HEHE	#3B8282	25	1365	2026-10-29 09:30:34.679811+00	2026-10-29 09:30:48.236445+00
ITZt-wwsk	HEHE	#3B8282	25	1365	2026-10-29 10:06:13.05884+00	2026-10-29 10:06:20.279249+00
j0NWlGs9A	HEHE	#3B8282	25	1365	2026-10-29 01:42:15.514349+00	2026-10-29 01:42:23.740772+00
iSHDK3g3m	HEHE	#3B8282	25	1365	2026-10-29 09:31:29.621802+00	2026-10-29 09:31:34.205335+00
ApFFXkNgg	Admin	#3B8282	25	1365	2026-10-29 01:42:14.494427+00	2026-10-29 01:42:24.419266+00
fD6057zoM	Admin	#3B8282	25	1365	2026-10-29 10:06:12.821533+00	2026-10-29 10:06:20.388461+00
o_pldnDqF	Admin	#3B8282	25	1365	2026-10-29 01:42:24.908377+00	2026-10-29 01:42:29.629798+00
BjI-2zfp_	HEHE	#3B8282	25	1365	2026-10-29 01:42:24.221425+00	2026-10-29 01:42:29.696675+00
HJTfOpgdn	HEHE	#3B8282	25	1365	2026-10-29 09:31:34.528665+00	2026-10-29 09:31:43.23318+00
-UBydRke-	HEHE	#3B8282	25	1365	2026-10-29 01:42:30.241939+00	2026-10-29 01:42:32.677243+00
NedqQ9LZD	Admin	#3B8282	25	1365	2026-10-29 01:42:30.165702+00	2026-10-29 01:42:32.786175+00
rrOGH2zJx	HEHE	#3B8282	25	1365	2026-10-29 09:31:43.655102+00	2026-10-29 09:31:54.222755+00
OJRP3OyIu	HEHE	#3B8282	25	1365	2026-10-29 01:42:33.153979+00	2026-10-29 01:42:38.684966+00
rmjit-tFA	Admin	#3B8282	25	1365	2026-10-29 10:06:20.784777+00	2026-10-29 10:06:34.377294+00
I1XyceRrr	Admin	#3B8282	25	1365	2026-10-29 09:31:54.832755+00	2026-10-29 09:32:05.472865+00
kTGGTJi6A	HEHE	#3B8282	25	1365	2026-10-29 01:42:39.09396+00	2026-10-29 01:42:44.69083+00
_MME_XVW-	Admin	#3B8282	1371.7016761054417	898.0016073249043	2026-10-29 04:37:42.700121+00	2026-10-29 05:37:12.104134+00
KE4p0fi_I	HEHE	#3B8282	25	1365	2026-10-29 09:32:05.612269+00	2026-10-29 09:32:20.228431+00
Nym08QnFU	Shadow Knight	#3B8282	1215.865127136775	975.8349726442249	2026-10-29 02:00:13.856295+00	2026-10-29 02:01:05.022454+00
8t2aqceiz	Admin	#3B8282	25	1365	2026-10-29 10:06:34.745628+00	2026-10-29 10:06:59.619367+00
QUIghznYT	Admin	#3B8282	25	1365	2026-10-29 09:33:02.849352+00	2026-10-29 09:33:18.431706+00
rz5CnD99D	HEHE	#3B8282	579.0160267144282	1359.3631351851388	2026-11-13 01:35:41.216953+00	2026-11-13 01:44:05.773831+00
qySlT7WH0	Admin	#3B8282	25	1365	2026-10-29 09:33:51.759078+00	2026-10-29 09:34:04.495361+00
NGZHRws_N	HEHE	#3B8282	25	1365	2026-10-29 01:43:26.02784+00	2026-10-29 01:43:46.70246+00
llxNQPkwv	HEHE	#3B8282	25	1365	2026-10-29 09:34:04.555484+00	2026-10-29 09:34:44.247545+00
rpOYMPM9S	HEHE	#3B8282	25	1365	2026-10-29 09:34:51.714905+00	2026-10-29 09:35:01.237747+00
K7wOmmL8t	HEHE	#3B8282	25	1365	2026-10-29 01:43:47.059205+00	2026-10-29 01:44:20.713563+00
8nLbEP_Qp	Admin	#3B8282	992.6305903825535	404.3170420626087	2026-10-29 05:38:13.608715+00	2026-10-29 05:43:20.759885+00
tq7a6xnJj	Admin	#3B8282	1065.938629277812	1594.1768305254902	2026-10-29 03:07:31.981453+00	2026-10-29 03:24:33.263708+00
wXFFeCQQX	HEHE	#3B8282	25	1365	2026-10-29 03:26:39.488549+00	2026-10-29 03:26:41.893053+00
Le-lSZu6u	HEHE	#3B8282	25	1365	2026-11-13 10:29:46.510762+00	2026-11-13 10:29:47.980148+00
cUVzXFUYN	HEHE	#3B8282	25	1365	2026-10-29 09:51:18.265667+00	2026-10-29 09:51:20.255141+00
l6xlj_dF-	Admin	#3B8282	25	1365	2026-10-29 09:23:05.024269+00	2026-10-29 09:23:11.480182+00
e0baEZAZt	Admin	#3B8282	25	1365	2026-10-29 10:31:58.838605+00	2026-10-29 10:32:00.375962+00
NDD6DKFO7	HEHE	#3B8282	25	1365	2026-10-29 05:25:55.876077+00	2026-10-29 05:26:19.017881+00
_9jOJMhtJ	Admin	#3B8282	1073.6369610802028	1617.9984052044983	2026-10-29 02:43:24.974408+00	2026-10-29 02:59:25.650009+00
yhgfD3zO5	Admin	#3B8282	25	1365	2026-10-29 03:00:27.836205+00	2026-10-29 03:00:27.836205+00
m9YnCH1F6	Admin	#3B8282	1064.3002722296696	1600.5327476780533	2026-10-29 05:48:07.665158+00	2026-10-29 07:44:24.076338+00
er4Na5WTp	Admin	#3B8282	25	1365	2026-10-29 09:52:26.669819+00	2026-10-29 09:52:37.471998+00
6X2IonFpZ	HEHE	#3B8282	25	1365	2026-10-29 03:02:48.265279+00	2026-10-29 03:02:55.690177+00
Xz6DI9mtt	Admin	#3B8282	25	1365	2026-10-29 04:26:31.909094+00	2026-10-29 04:27:19.13094+00
NoR8GP0lB	HEHE	#3B8282	25	1365	2026-10-29 03:02:56.197841+00	2026-10-29 03:02:58.648001+00
IgeSqO1j3	HEHE	#3B8282	25	1365	2026-10-29 05:43:11.213383+00	2026-10-29 05:43:20.759939+00
o8BQz_pZf	Admin	#3B8282	25	1365	2026-10-29 03:02:58.725252+00	2026-10-29 03:03:06.222041+00
3S7urGvUo	HEHE	#3B8282	25	1365	2026-10-29 07:45:29.64359+00	2026-10-29 07:45:32.209921+00
DesJhYgwn	HEHE	#3B8282	25	1365	2026-10-29 09:23:11.673964+00	2026-10-29 09:23:26.252893+00
bD9JCoIr3	Admin	#3B8282	25	1365	2026-10-29 07:45:31.798159+00	2026-10-29 07:45:38.43023+00
qgTfJTp0Q	Admin	#3B8282	25	1365	2026-10-29 03:03:06.661469+00	2026-10-29 03:03:29.719314+00
5a8bg14Q6	Admin	#3B8282	25	1365	2026-10-29 09:23:25.960441+00	2026-10-29 09:23:33.568659+00
xl_Hxrocw	HEHE	#3B8282	25	1365	2026-10-29 07:45:39.507736+00	2026-10-29 07:45:42.227635+00
5foXdlTmq	Admin	#3B8282	25	1365	2026-10-29 04:27:19.571499+00	2026-10-29 04:27:34.128845+00
w_wuJjj-S	HEHE	#3B8282	25	1365	2026-10-29 04:27:20.107742+00	2026-10-29 04:27:34.658085+00
Iim4vr8q5	Admin	#3B8282	1040.9948096513867	1570.6359432650156	2026-10-29 03:24:33.642933+00	2026-10-29 03:25:08.404158+00
G3JKt1ygd	Admin	#3B8282	25	1365	2026-10-29 04:27:34.46268+00	2026-10-29 04:27:46.500132+00
GPGfCU5F1	Admin	#3B8282	25	1365	2026-10-29 03:28:11.74459+00	2026-10-29 03:28:12.260901+00
oJCWwWuYJ	Admin	#3B8282	25	1365	2026-10-29 09:23:42.864358+00	2026-10-29 09:23:42.864358+00
GCIZixfHA	HEHE	#3B8282	25	1365	2026-10-29 09:23:33.661381+00	2026-10-29 09:23:43.216476+00
_gCcaztTr	Admin	#3B8282	25	1365	2026-10-29 09:27:37.083015+00	2026-10-29 09:27:42.419331+00
SUY9ShK77	HEHE	#3B8282	25	1365	2026-10-29 09:27:49.595798+00	2026-10-29 09:27:52.210067+00
9_fq5QDU-	EmberF	#3B8282	1400.3314453665378	1372.4969909627866	2026-10-29 10:32:28.430764+00	2026-10-29 10:33:14.364339+00
WS9KoCTpg	Admin	#3B8282	25	1365	2026-10-29 09:27:52.875319+00	2026-10-29 09:27:58.478193+00
ld32wEzMY	HEHE	#3B8282	25	1365	2026-10-29 09:53:23.695493+00	2026-10-29 09:53:27.345819+00
MofSTUZ8d	HEHE	#3B8282	25	1365	2026-10-29 09:27:58.648609+00	2026-10-29 09:28:16.269643+00
SXdl549_C	HEHE	#3B8282	25	1365	2026-10-29 10:33:15.632642+00	2026-10-29 10:33:21.223874+00
cngU84S3M	EmberF	#3B8282	901.1999999999999	1365	2026-10-29 10:34:33.480515+00	2026-10-29 10:34:39.529473+00
SjlIiUqSL	HEHE	#3B8282	25	1365	2026-10-29 09:53:42.972646+00	2026-10-29 09:53:49.404152+00
FHMLVq1CQ	Admin	#3B8282	25	1365	2026-10-29 09:52:55.380072+00	2026-10-29 09:53:49.474466+00
X8LjFZLyQ	Admin	#3B8282	25	1365	2026-10-29 09:54:00.937822+00	2026-10-29 09:54:06.391395+00
LLrlRWH6B	HEHE	#3B8282	25	1365	2026-10-29 09:28:16.703512+00	2026-10-29 09:29:06.305544+00
RCPn4BwlU	HEHE	#3B8282	25	1365	2026-10-29 09:29:06.839461+00	2026-10-29 09:29:09.193006+00
6PayBjZ-_	EmberF	#3B8282	25	1365	2026-10-29 10:34:39.881895+00	2026-10-29 10:34:48.618408+00
fkv20BGmS	HEHE	#3B8282	25	1365	2026-10-29 09:29:16.028201+00	2026-10-29 09:29:18.246198+00
FOfb0J8ao	EmberF	#3B8282	25	1365	2026-10-29 10:34:52.135387+00	2026-10-29 10:34:52.135387+00
wFF2fQdNx	HEHE	#3B8282	25	1365	2026-10-29 09:29:21.713802+00	2026-10-29 09:29:28.254168+00
nURgF7UMM	HEHE	#3B8282	25	1365	2026-10-29 10:34:46.551564+00	2026-10-29 10:34:52.28422+00
3O-LYJirO	Admin	#3B8282	25	1365	2026-10-29 09:29:43.974159+00	2026-10-29 09:29:50.497976+00
hx9_wlqEA	Admin	#3B8282	25	1365	2026-10-29 09:29:50.875247+00	2026-10-29 09:29:59.433676+00
J9ooyobT8	HEHE	#3B8282	1363.523232303638	1403.9872099169652	2026-10-29 10:35:35.638541+00	2026-10-29 10:35:54.131245+00
8ueB28wtX	HEHE	#3B8282	25	1365	2026-10-29 09:30:00.591114+00	2026-10-29 09:30:12.283416+00
XUFR1HU3A	HEHE	#3B8282	25	1365	2026-10-29 10:37:31.678533+00	2026-10-29 10:37:42.369025+00
TLV3qw5Ck	HEHE	#3B8282	25	1365	2026-10-29 09:30:12.763709+00	2026-10-29 09:30:24.286185+00
AjXkksPDa	HEHE	#3B8282	25	1365	2026-10-29 10:38:33.052789+00	2026-10-29 10:38:45.21744+00
eiHmTttVv	HEHE	#3B8282	25	1365	2026-10-29 09:30:52.68765+00	2026-10-29 09:30:59.211336+00
h_F-XeOrV	HEHE	#3B8282	25	1365	2026-10-29 09:30:59.646648+00	2026-10-29 09:31:03.207907+00
FWbVP3-6V	Admin	#3B8282	25	1365	2026-10-29 09:30:59.919138+00	2026-10-29 09:31:03.418122+00
2abl6uyIq	HEHE	#3B8282	25	1365	2026-10-29 10:38:50.563423+00	2026-10-29 10:39:09.230007+00
lYJVsjlZo	HEHE	#3B8282	25	1365	2026-10-29 10:41:08.477352+00	2026-10-29 10:41:08.477352+00
laRLSA2C_	HEHE	#3B8282	25	1365	2026-10-29 10:46:08.936584+00	2026-10-29 10:46:21.566234+00
r2B9hblkm	HEHE	#3B8282	25	1365	2026-10-29 09:31:03.567355+00	2026-10-29 09:31:23.2228+00
P4_H4yCHC	Admin	#3B8282	25	1365	2026-10-29 09:31:03.813097+00	2026-10-29 09:31:23.496236+00
xlpWMSGxC	HEHE	#3B8282	25	1365	2026-10-29 09:31:23.634479+00	2026-10-29 09:31:29.214029+00
2iGAsLJgm	Admin	#3B8282	25	1365	2026-10-29 09:31:29.907743+00	2026-10-29 09:31:34.504034+00
eZn39V4iD	Admin	#3B8282	25	1365	2026-10-29 09:31:34.877321+00	2026-10-29 09:31:43.464371+00
Y3L3P0qyQ	HEHE	#3B8282	25	1365	2026-10-29 09:31:54.713957+00	2026-10-29 09:32:05.225325+00
tvAVSNG6p	Admin	#3B8282	1076.0056630177708	1521.4853202162785	2026-10-29 04:29:23.731285+00	2026-10-29 04:36:25.317996+00
rQW2Xg1e1	Admin	#3B8282	25	1365	2026-10-29 09:32:05.858349+00	2026-10-29 09:32:20.503093+00
M855Y5A6O	HEHE	#3B8282	25	1365	2026-10-29 09:32:28.619475+00	2026-10-29 09:32:36.245263+00
TG_SiTXKg	Admin	#3B8282	25	1365	2026-10-29 09:32:36.944606+00	2026-10-29 09:32:39.40795+00
4FAflvNh-	HEHE	#3B8282	25	1365	2026-10-29 09:32:36.626033+00	2026-10-29 09:32:40.269899+00
5a9evNvTB	Admin	#3B8282	25	1365	2026-10-29 09:32:39.779484+00	2026-10-29 09:32:46.434483+00
eLZK2fGSA	HEHE	#3B8282	25	1365	2026-10-29 09:32:40.782433+00	2026-10-29 09:32:47.240726+00
oCCMHv7PL	HEHE	#3B8282	25	1365	2026-10-29 09:32:47.63356+00	2026-10-29 09:32:55.203299+00
jyy1xHaEW	Admin	#3B8282	25	1365	2026-10-29 09:32:46.922863+00	2026-10-29 09:32:55.418596+00
NTgN9vNeC	HEHE	#3B8282	25	1365	2026-10-29 09:32:55.56949+00	2026-10-29 09:33:02.245044+00
uWZT53ryM	HEHE	#3B8282	25	1365	2026-10-29 09:33:51.81508+00	2026-10-29 09:34:04.22729+00
yB5JnH2Xu	Admin	#3B8282	25	1365	2026-10-29 09:34:04.702971+00	2026-10-29 09:34:44.421134+00
TBqpqfMh3	Admin	#3B8282	25	1365	2026-10-29 09:34:51.93074+00	2026-10-29 09:35:01.49114+00
MCqt4Z5Nx	Admin	#3B8282	25	1365	2026-10-29 09:35:01.873743+00	2026-10-29 09:35:32.820183+00
yQXthPuyP	HEHE	#3B8282	25	1365	2026-10-29 09:35:01.79479+00	2026-10-29 09:35:32.820132+00
23Ddx-cje	Admin	#3B8282	455.1207960496172	1311.6930246750244	2026-11-12 16:35:56.576788+00	2026-11-12 16:42:13.332881+00
yO6fxzCYz	Admin	#3B8282	25	1365	2026-11-12 16:42:18.988182+00	2026-11-12 16:42:56.396634+00
yJ_ZQ0XFz	HEHE	#3B8282	1357.395740763049	1511.4997780710341	2026-10-29 09:39:16.369383+00	2026-10-29 09:41:26.33484+00
2RBtDU0U-	Admin	#3B8282	1385.4322447857335	1511.4779786363852	2026-10-29 10:09:48.301993+00	2026-10-29 10:27:53.482744+00
xIvBcZ8SZ	Admin	#3B8282	782.0610232112888	1506.6501011016942	2026-10-29 09:55:55.190078+00	2026-10-29 10:04:01.485699+00
ITqBxu6x5	Admin	#3B8282	688.1805356185794	1372.4851188533125	2026-11-13 01:13:31.512598+00	2026-11-13 01:43:37.662693+00
JOWXqvE9n	Admin	#3B8282	351.55999999999995	1365	2026-11-13 01:43:57.935704+00	2026-11-13 01:44:04.885575+00
J_VXT2a5C	Admin	#3B8282	25	1365	2026-11-13 01:44:05.395695+00	2026-11-13 01:44:07.710029+00
K-o0vmSaf	Admin	#3B8282	25	1365	2026-10-29 10:32:00.74961+00	2026-10-29 10:32:00.74961+00
2Lumg8MgR	Admin	#3B8282	25	1365	2026-10-29 07:45:29.785423+00	2026-10-29 07:45:31.400764+00
d_uMtYeOq	HEHE	#3B8282	25	1365	2026-11-13 06:31:17.854684+00	2026-11-13 06:31:19.438292+00
qbZoW-S-y	EmberF	#3B8282	63.504375000000024	1360.252291666667	2026-10-29 10:33:14.796224+00	2026-10-29 10:33:20.203078+00
_RUnAi6S6	Admin	#3B8282	25	1365	2026-10-29 09:23:11.877088+00	2026-10-29 09:23:25.504557+00
Q2Tdm_EjV	HEHE	#3B8282	25	1365	2026-10-29 07:45:32.630356+00	2026-10-29 07:45:39.138878+00
qSNQzPCZf	HEHE	#3B8282	1104.2247472847116	1598.0457210692753	2026-10-29 02:57:10.10709+00	2026-10-29 02:59:25.650077+00
BRHnBLeSR	HEHE	#3B8282	25	1365	2026-10-29 03:00:28.120354+00	2026-10-29 03:00:28.120354+00
ynU05r4sN	HEHE	#3B8282	25	1365	2026-10-29 05:36:40.398313+00	2026-10-29 05:37:12.104139+00
WcjVMcLOk	Admin	#3B8282	25	1365	2026-10-29 07:45:38.738889+00	2026-10-29 07:45:41.402618+00
g7gfR-P7d	HEHE	#3B8282	25	1365	2026-10-29 03:02:59.061958+00	2026-10-29 03:03:06.641856+00
54H0ANc9D	HEHE	#3B8282	25	1365	2026-11-13 01:44:06.737773+00	2026-11-13 01:44:07.710029+00
JiZVS2gWd	HEHE	#3B8282	25	1365	2026-10-29 09:23:26.687162+00	2026-10-29 09:23:33.221919+00
RuDjsHFkd	Admin	#3B8282	25	1365	2026-11-13 01:45:21.108482+00	2026-11-13 01:45:23.843568+00
V9abeSUV-	HEHE	#3B8282	25	1365	2026-10-29 03:03:07.05822+00	2026-10-29 03:03:29.719362+00
Li1Ev7jqO	Admin	#3B8282	1369.7675392681433	1312.1088199210164	2026-10-29 05:43:44.613024+00	2026-10-29 05:48:07.22943+00
_9j4dZdb_	HEHE	#3B8282	25	1365	2026-10-29 07:45:42.718521+00	2026-10-29 07:45:52.230295+00
1sgKCqkJq	Admin	#3B8282	25	1365	2026-10-29 07:45:41.744029+00	2026-10-29 07:45:52.398818+00
DvHJ6cZjF	Admin	#3B8282	25	1365	2026-10-29 09:23:34.010563+00	2026-10-29 09:23:42.43002+00
5LyrLH2j0	HEHE	#3B8282	25	1365	2026-10-29 03:26:10.989444+00	2026-10-29 03:26:38.11513+00
nSyoj8dBb	HEHE	#3B8282	25	1365	2026-10-29 09:23:43.587667+00	2026-10-29 09:23:43.587667+00
ntIBfU38z	HEHE	#3B8282	25	1365	2026-10-29 09:27:37.091907+00	2026-10-29 09:27:42.258954+00
pt_MQDmQG	HEHE	#3B8282	25	1365	2026-11-13 01:45:24.260043+00	2026-11-13 01:45:37.682453+00
2RT4-AqjN	HEHE	#3B8282	25	1365	2026-10-29 09:27:42.625956+00	2026-10-29 09:27:49.252937+00
PfvRlaoDb	HEHE	#3B8282	25	1365	2026-10-29 09:27:52.605085+00	2026-10-29 09:27:58.237356+00
AbwZvctvL	Admin	#3B8282	1085.5810933464218	1605.45997685604	2026-10-29 03:28:13.687256+00	2026-10-29 04:24:38.069975+00
HAN496EHR	HEHE	#3B8282	25	1365	2026-11-13 01:45:38.129907+00	2026-11-13 01:45:51.664261+00
tAPdZA-s-	Admin	#3B8282	25	1365	2026-10-29 09:27:58.82375+00	2026-10-29 09:28:16.444724+00
EFXiRMr7z	HEHE	#3B8282	25	1365	2026-10-29 09:29:09.620433+00	2026-10-29 09:29:12.3232+00
NCNcJdoBb	Admin	#3B8282	25	1365	2026-10-29 09:29:11.784937+00	2026-10-29 09:29:15.413297+00
rV2XPnXuJ	Admin	#3B8282	25	1365	2026-10-29 09:29:15.901445+00	2026-10-29 09:29:18.522028+00
vnLrTCtnH	HEHE	#3B8282	25	1365	2026-10-29 04:26:32.193753+00	2026-10-29 04:27:19.663273+00
Kpb2V7_gW	HEHE	#3B8282	25	1365	2026-10-29 09:29:18.706745+00	2026-10-29 09:29:21.234246+00
1uwUR6j4N	HEHE	#3B8282	25	1365	2026-10-29 04:27:35.016373+00	2026-10-29 04:27:46.500183+00
KhghFK2Kg	Admin	#3B8282	25	1365	2026-10-29 09:29:22.21556+00	2026-10-29 09:29:28.482117+00
iVUcz11Z-	HEHE	#3B8282	25	1365	2026-10-29 09:29:34.70591+00	2026-10-29 09:29:37.219586+00
29NZK93xk	Admin	#3B8282	25	1365	2026-10-29 09:29:37.788897+00	2026-10-29 09:29:43.432756+00
gxMeg4Yg4	HEHE	#3B8282	25	1365	2026-10-29 09:29:43.617139+00	2026-10-29 09:29:50.222626+00
yVB_7wwTe	HEHE	#3B8282	25	1365	2026-10-29 09:29:50.584632+00	2026-10-29 09:30:00.20289+00
fiTIVewc0	EmberF	#3B8282	1385.4682639412765	1511.4676772537134	2026-10-29 10:33:20.549531+00	2026-10-29 10:34:30.365192+00
q31ZMDzf-	Admin	#3B8282	25	1365	2026-10-29 09:29:59.792171+00	2026-10-29 09:30:12.41944+00
JUyyDXBxt	HEHE	#3B8282	25	1365	2026-10-29 10:33:21.853671+00	2026-10-29 10:34:31.26946+00
RsJ-BjJL2	HEHE	#3B8282	1005.750287502934	1584.8613425389283	2026-10-29 04:34:35.13204+00	2026-10-29 04:36:25.423349+00
_H0JKvd4n	Admin	#3B8282	25	1365	2026-10-29 09:30:12.853391+00	2026-10-29 09:30:24.408439+00
f5c8yJBP2	EmberF	#3B8282	25	1365	2026-10-29 10:34:30.780065+00	2026-10-29 10:34:33.029847+00
d0jKWHdqr	HEHE	#3B8282	25	1365	2026-10-29 04:38:35.495851+00	2026-10-29 04:38:47.599281+00
bzs7bmYlH	HEHE	#3B8282	1071.3276005232162	1521.4795315961162	2026-10-29 02:46:17.354181+00	2026-10-29 02:57:09.393029+00
waVsI3oLm	HEHE	#3B8282	25	1365	2026-10-29 09:30:24.717323+00	2026-10-29 09:30:34.226047+00
7xBqVjG-X	HEHE	#3B8282	25	1365	2026-10-29 10:34:33.642499+00	2026-10-29 10:34:40.214827+00
oQqjNFyU8	Admin	#3B8282	25	1365	2026-10-29 09:30:33.874406+00	2026-10-29 09:30:48.407031+00
8iAj3DBws	Admin	#3B8282	25	1365	2026-10-29 09:30:48.782865+00	2026-10-29 09:30:52.425885+00
V9FqaJ7hz	HEHE	#3B8282	25	1365	2026-10-29 10:34:40.570271+00	2026-10-29 10:34:46.217267+00
J55aaniBb	Admin	#3B8282	25	1365	2026-10-29 09:30:52.803915+00	2026-10-29 09:30:59.429772+00
gC_LoLDHf	EmberF	#3B8282	25	1365	2026-10-29 10:34:50.384939+00	2026-10-29 10:34:51.479477+00
FsMgmb3JI	Admin	#3B8282	25	1365	2026-10-29 09:31:23.890555+00	2026-10-29 09:31:29.404295+00
6J_s4lYBm	HEHE	#3B8282	25	1365	2026-10-29 10:34:52.824291+00	2026-10-29 10:34:52.824291+00
fN5QDehQF	Admin	#3B8282	25	1365	2026-10-29 09:31:43.953506+00	2026-10-29 09:31:54.434586+00
BeeeCXQ6C	HEHE	#3B8282	25	1365	2026-10-29 10:37:07.866508+00	2026-10-29 10:37:13.235331+00
7bV6hdGYU	HEHE	#3B8282	25	1365	2026-10-29 09:32:20.748384+00	2026-10-29 09:32:28.210973+00
Zf-jZ-MUC	HEHE	#3B8282	25	1365	2026-10-29 10:37:29.670797+00	2026-10-29 10:37:31.315947+00
uDU2442DZ	Admin	#3B8282	25	1365	2026-10-29 09:32:28.755344+00	2026-10-29 09:32:36.427498+00
gVxxoiPcO	Admin	#3B8282	25	1365	2026-10-29 09:32:55.845572+00	2026-10-29 09:33:02.46828+00
4UNmu29qH	HEHE	#3B8282	25	1365	2026-10-29 10:37:53.617507+00	2026-10-29 10:38:10.22019+00
g-Nmfjg8f	HEHE	#3B8282	25	1365	2026-10-29 10:38:27.671158+00	2026-10-29 10:38:32.265768+00
YEljvM1xS	HEHE	#3B8282	25	1365	2026-10-29 09:33:02.692426+00	2026-10-29 09:33:18.223799+00
61jAofFah	HEHE	#3B8282	25	1365	2026-10-29 10:40:14.821493+00	2026-10-29 10:40:14.821493+00
g8kNGdZ7M	Admin	#3B8282	25	1365	2026-10-29 09:33:18.79739+00	2026-10-29 09:33:21.539934+00
z1vADO88g	HEHE	#3B8282	25	1365	2026-10-29 10:44:07.787925+00	2026-10-29 10:44:21.267567+00
fJDoMdfYy	Admin	#3B8282	25	1365	2026-10-29 09:33:22.0468+00	2026-10-29 09:33:51.433258+00
1PLnJ5lwW	Admin	#3B8282	25	1365	2026-10-29 09:34:44.781352+00	2026-10-29 09:34:51.49245+00
FBk9nmTcp	HEHE	#3B8282	25	1365	2026-10-29 09:36:09.903144+00	2026-10-29 09:36:40.745165+00
cRExdUHMd	HEHE	#3B8282	25	1365	2026-10-29 10:51:57.114949+00	2026-10-29 10:53:14.941022+00
Wx8wjmj7B	HEHE	#3B8282	1410.5120867148441	1562.4302418895122	2026-10-29 09:41:26.807479+00	2026-10-29 09:51:17.242422+00
MIq3lPVD6	HEHE	#3B8282	25	1365	2026-10-29 09:51:20.953663+00	2026-10-29 09:51:20.953663+00
tnZ9Nc3YA	HEHE	#3B8282	25	1365	2026-10-29 09:52:37.700995+00	2026-10-29 09:52:42.34744+00
w4R5xGrPj	Admin	#3B8282	25	1365	2026-10-29 09:52:43.42541+00	2026-10-29 09:52:50.455509+00
s_dEfADIU	HEHE	#3B8282	25	1365	2026-10-29 09:52:50.517768+00	2026-10-29 09:52:54.260062+00
blozMYMK3	HEHE	#3B8282	25	1365	2026-10-29 09:52:54.769715+00	2026-10-29 09:53:21.011334+00
EAv-JbaM0	HEHE	#3B8282	25	1365	2026-10-29 09:53:21.644016+00	2026-10-29 09:53:22.61023+00
5CkccuZgW	HEHE	#3B8282	25	1365	2026-10-29 09:53:28.16093+00	2026-10-29 09:53:40.74884+00
ui1ZKyRg8	HEHE	#3B8282	25	1365	2026-10-29 09:53:41.368377+00	2026-10-29 09:53:42.326875+00
CH3kuWmqn	HEHE	#3B8282	25	1365	2026-10-29 09:53:50.188632+00	2026-10-29 09:54:00.312725+00
stNQGQLs6	Admin	#3B8282	25	1365	2026-10-29 09:53:49.903323+00	2026-10-29 09:54:00.496994+00
Rwew8gYiR	HEHE	#3B8282	25	1365	2026-10-29 09:54:01.682586+00	2026-10-29 09:54:06.23351+00
ug5aYdczN	Admin	#3B8282	25	1365	2026-10-29 09:54:06.935739+00	2026-10-29 09:54:13.475516+00
9BYNuwMhG	HEHE	#3B8282	25	1365	2026-10-29 09:54:14.126401+00	2026-10-29 09:54:30.051647+00
DNHaVrX-t	HEHE	#3B8282	25	1365	2026-10-29 09:54:30.902849+00	2026-10-29 09:55:03.752434+00
_ZZgO8Lxo	Admin	#3B8282	25	1365	2026-10-29 09:54:14.007229+00	2026-10-29 09:55:03.752392+00
KYoNNq1l7	Dauss	#3B8282	281.06845671067447	1260.6836385590032	2026-11-12 16:36:29.284661+00	2026-11-12 16:41:56.649707+00
dMIoPRvOK	Dauss	#3B8282	297.69856131272707	1350.7414386872726	2026-11-12 16:57:42.545667+00	2026-11-12 17:00:50.73417+00
0BOtZkX4T	HEHE	#3B8282	25	1365	2026-10-29 10:06:21.113501+00	2026-10-29 10:06:34.281529+00
GxOxZYjBr	HEHE	#3B8282	25	1365	2026-11-13 01:45:16.357616+00	2026-11-13 01:45:20.657937+00
s1Ok4nChj	Admin	#3B8282	25	1365	2026-11-13 01:45:16.085438+00	2026-11-13 01:45:20.708702+00
utxS9Wx0a	HEHE	#3B8282	25	1365	2026-11-13 06:31:19.899245+00	2026-11-13 06:31:20.446526+00
M9Fr9ZZXs	HEHE	#3B8282	25	1365	2026-11-13 01:45:21.150768+00	2026-11-13 01:45:23.656535+00
jkTrPAxee	HEHE	#3B8282	25	1365	2026-10-29 10:06:34.941084+00	2026-10-29 10:06:59.619413+00
tt3tpLD_H	Admin	#3B8282	25	1365	2026-11-13 03:42:10.244937+00	2026-11-13 03:42:29.647335+00
JbH7hrFen	HEHE	#3B8282	25	1365	2026-11-13 03:44:33.259456+00	2026-11-13 03:44:34.562107+00
EONFAMNIq	Admin	#3B8282	25	1365	2026-11-13 01:45:24.329934+00	2026-11-13 01:45:37.985852+00
H6fRHTTF2	HEHE	#3B8282	25	1365	2026-11-13 09:16:28.466534+00	2026-11-13 09:16:51.33768+00
fPacOLyb1	Admin	#3B8282	25	1365	2026-11-13 01:45:38.304904+00	2026-11-13 01:45:50.114483+00
xdk_e5B5D	HEHE	#3B8282	25	1365	2026-11-13 09:16:51.708888+00	2026-11-13 09:16:54.314889+00
FDa2bLUnT	HEHE	#3B8282	25	1365	2026-11-13 06:31:25.812478+00	2026-11-13 06:31:46.641868+00
lH_MVtvZY	HEHE	#3B8282	25	1365	2026-11-13 09:16:54.626115+00	2026-11-13 09:16:55.287148+00
LsiO9IyE_	HEHE	#3B8282	25	1365	2026-11-13 03:44:35.095138+00	2026-11-13 03:45:12.757566+00
hopqLTYoR	HEHE	#3B8282	25	1365	2026-11-13 09:16:55.695103+00	2026-11-13 09:16:57.334137+00
uEGIDTtZj	HEHE	#3B8282	25	1365	2026-11-13 06:32:22.890451+00	2026-11-13 06:32:51.51656+00
ZLN39swQL	HEHE	#3B8282	25	1365	2026-11-13 09:16:57.699689+00	2026-11-13 09:16:58.360121+00
ImcLY3jHb	HEHE	#3B8282	25	1365	2026-11-13 06:33:08.17119+00	2026-11-13 06:33:09.457348+00
qUJiCqK9W	HEHE	#3B8282	25	1365	2026-11-13 03:45:26.466174+00	2026-11-13 03:45:44.758873+00
90R4Ml0La	Admin	#3B8282	25	1365	2026-11-13 03:45:26.244578+00	2026-11-13 03:45:44.758829+00
WkDyLJe3p	HEHE	#3B8282	25	1365	2026-11-13 06:33:55.825032+00	2026-11-13 06:33:57.507552+00
eyTea4cB4	HEHE	#3B8282	25	1365	2026-11-13 01:45:51.934846+00	2026-11-13 01:46:30.764008+00
f6Mz2TUiw	HEHE	#3B8282	25	1365	2026-11-13 09:16:58.797447+00	2026-11-13 09:16:59.35575+00
JDjgAp1Z-	Admin	#3B8282	25	1365	2026-11-13 01:45:50.464917+00	2026-11-13 01:46:31.3539+00
_rpakiLgj	HEHE	#3B8282	25	1365	2026-11-13 06:33:57.954958+00	2026-11-13 06:33:58.442822+00
HVtdj1bU3	Admin	#3B8282	1062.7036047467388	1372.4735912671108	2026-10-29 10:07:27.659797+00	2026-10-29 10:31:13.36224+00
Z5_5lyFB3	HEHE	#3B8282	25	1365	2026-10-29 10:32:01.214685+00	2026-10-29 10:32:01.214685+00
8QsK30l_t	Admin	#3B8282	25	1365	2026-10-29 10:33:15.629613+00	2026-10-29 10:33:20.404907+00
UYNw2bMCu	HEHE	#3B8282	25	1365	2026-11-13 06:34:22.059405+00	2026-11-13 06:34:23.453823+00
BRQOSMqC8	Admin	#3B8282	25	1365	2026-11-13 01:46:31.791564+00	2026-11-13 01:46:35.4756+00
8wnKhWKHv	HEHE	#3B8282	25	1365	2026-11-13 01:46:31.294737+00	2026-11-13 01:46:35.696713+00
1_fSmNc6q	HEHE	#3B8282	25	1365	2026-11-13 06:34:24.848842+00	2026-11-13 06:34:26.445834+00
CMxZiygVi	Admin	#3B8282	25	1365	2026-11-13 01:46:35.891128+00	2026-11-13 01:46:39.578468+00
tdX2StKgS	HEHE	#3B8282	25	1365	2026-11-13 01:46:36.189459+00	2026-11-13 01:46:39.644704+00
WKnNygs-P	Admin	#3B8282	25	1365	2026-10-29 10:33:20.831007+00	2026-10-29 10:34:02.321261+00
e4yzTE4sr	HEHE	#3B8282	25	1365	2026-10-29 10:34:31.772417+00	2026-10-29 10:34:33.211019+00
BGNHWXpxS	HEHE	#3B8282	25	1365	2026-10-29 10:35:18.686735+00	2026-10-29 10:35:18.686735+00
AhcWAwUTF	HEHE	#3B8282	25	1365	2026-11-13 06:34:26.838496+00	2026-11-13 06:34:28.452767+00
X6whK3mee	HEHE	#3B8282	25	1365	2026-10-29 10:37:13.641715+00	2026-10-29 10:37:29.257694+00
sluJVpzUy	HEHE	#3B8282	25	1365	2026-11-13 01:46:40.061253+00	2026-11-13 01:46:48.640533+00
wTKeXeUMC	Admin	#3B8282	25	1365	2026-11-13 01:46:39.940099+00	2026-11-13 01:46:48.680806+00
W0SwEQVo0	HEHE	#3B8282	25	1365	2026-10-29 10:37:42.884452+00	2026-10-29 10:37:53.212253+00
fh7b1unYE	HEHE	#3B8282	25	1365	2026-11-13 06:34:30.820577+00	2026-11-13 06:34:45.438455+00
PgoL-ZFQS	HEHE	#3B8282	25	1365	2026-10-29 10:38:10.612642+00	2026-10-29 10:38:26.260636+00
iyjBD8D1f	HEHE	#3B8282	25	1365	2026-11-13 06:35:35.546841+00	2026-11-13 06:35:41.456757+00
Zin4ImSKb	HEHE	#3B8282	25	1365	2026-10-29 10:38:45.574089+00	2026-10-29 10:38:50.20471+00
D3GIoADYO	HEHE	#3B8282	25	1365	2026-10-29 10:41:03.729556+00	2026-10-29 10:41:08.200699+00
bAyQPqBq3	HEHE	#3B8282	25	1365	2026-11-13 06:46:20.658799+00	2026-11-13 06:46:26.774328+00
O4GXfVKjU	HEHE	#3B8282	25	1365	2026-11-13 06:48:22.366008+00	2026-11-13 06:48:22.60251+00
RkznqtZT5	HEHE	#3B8282	25	1365	2026-11-13 09:16:59.789023+00	2026-11-13 09:17:54.393196+00
P7c0mSJgf	HEHE	#3B8282	25	1365	2026-11-13 09:18:48.818767+00	2026-11-13 09:18:50.383513+00
MmXVX0xoY	HEHE	#3B8282	25	1365	2026-11-13 09:18:55.749881+00	2026-11-13 09:18:57.299974+00
PLuCq5T2P	Admin	#3B8282	664.1657999999991	1365	2026-11-13 09:45:28.033752+00	2026-11-13 09:47:27.357307+00
RC464ayJG	HEHE	#3B8282	25	1365	2026-11-13 01:46:49.110546+00	2026-11-13 01:47:29.712291+00
ugvMslvic	HEHE	#3B8282	25	1365	2026-10-29 10:45:08.130188+00	2026-10-29 10:46:08.081203+00
p5PDJSilb	Admin	#3B8282	25	1365	2026-11-13 01:46:49.111904+00	2026-11-13 01:47:29.868662+00
8JEjIhbR8	HEHE	#3B8282	25	1365	2026-11-13 09:47:30.327204+00	2026-11-13 10:09:16.423876+00
GYGI7DFmg	HEHE	#3B8282	25	1365	2026-10-29 10:53:15.608133+00	2026-10-29 10:53:28.52887+00
i_ozuqjV0	HEHE	#3B8282	25	1365	2026-11-13 01:47:30.242154+00	2026-11-13 01:47:32.646956+00
As6Q2C3VX	Admin	#3B8282	25	1365	2026-11-13 01:47:30.233+00	2026-11-13 01:47:33.000895+00
w5GDZCBu5	HEHE	#3B8282	25	1365	2026-11-13 09:18:57.758244+00	2026-11-13 09:19:13.339968+00
I3DgOVYnD	HEHE	#3B8282	1225	915	2026-11-13 10:09:35.088124+00	2026-11-13 10:09:39.919548+00
lfwH9nuGH	HEHE	#3B8282	25	1365	2026-11-13 09:19:17.954666+00	2026-11-13 09:19:20.367309+00
e_UWXLJrN	Admin	#3B8282	1092.8452027687388	1288.1631760539292	2026-11-12 16:34:05.544599+00	2026-11-12 16:34:34.477194+00
KVOk6XqCz	Admin	#3B8282	25	1365	2026-11-12 16:42:13.729096+00	2026-11-12 16:42:18.734221+00
bBcuURDQb	HEHE	#3B8282	25	1365	2026-11-13 01:47:33.005979+00	2026-11-13 01:47:41.65372+00
wyY6YdlYU	Admin	#3B8282	25	1365	2026-11-13 01:47:33.504517+00	2026-11-13 01:47:42.190548+00
uwVeBCi3p	Admin	#3B8282	25	1365	2026-11-13 01:47:42.692177+00	2026-11-13 01:47:52.299584+00
ofhY6NSGE	HEHE	#3B8282	25	1365	2026-11-13 01:47:42.154941+00	2026-11-13 01:47:52.651197+00
effbW7lYV	HEHE	#3B8282	25	1365	2026-11-13 09:19:40.791216+00	2026-11-13 09:20:26.30437+00
uPajRlukh	HEHE	#3B8282	25	1365	2026-11-13 01:47:53.16206+00	2026-11-13 01:48:10.665735+00
OW_aMWh9x	Admin	#3B8282	25	1365	2026-11-13 01:47:52.696834+00	2026-11-13 01:48:10.729891+00
O2Vcmz-bH	Admin	#3B8282	25	1365	2026-11-13 01:48:11.171249+00	2026-11-13 01:48:35.979278+00
dNNEQGJjg	HEHE	#3B8282	25	1365	2026-11-13 01:48:11.172674+00	2026-11-13 01:48:35.979322+00
sjGQGdExd	Admin	#3B8282	232.48000000000002	1365	2026-11-12 16:57:47.345581+00	2026-11-12 17:00:50.734693+00
eBruIbey6	Admin	#3B8282	525.6082816316954	1268.1278965393394	2026-11-13 02:04:14.011354+00	2026-11-13 02:08:24.635993+00
v583ZnIlS	Dauss	#3B8282	383.6378399566712	1338.0972095675302	2026-11-13 03:16:41.993807+00	2026-11-13 03:23:29.51441+00
P2dInSenz	HEHE	#3B8282	25	1365	2026-11-13 01:52:12.377528+00	2026-11-13 01:56:13.149603+00
Syge1qBp6	HEHE	#3B8282	25	1365	2026-11-13 01:56:13.919316+00	2026-11-13 02:00:14.960338+00
hXlbKtmC5	Admin	#3B8282	703.1666798967904	1218.2822752962225	2026-11-13 09:24:01.286307+00	2026-11-13 09:33:39.124003+00
-BinIJSYf	HEHE	#3B8282	25	1365	2026-11-13 09:33:59.729424+00	2026-11-13 09:34:01.101731+00
Hc-pQaZHo	HEHE	#3B8282	25	1365	2026-11-13 09:34:38.375889+00	2026-11-13 09:34:47.995208+00
WsrdBSCJY	HEHE	#3B8282	25	1365	2026-11-13 09:34:48.276712+00	2026-11-13 09:34:49.014337+00
VBcdu_K9C	HEHE	#3B8282	25	1365	2026-11-13 09:34:49.350568+00	2026-11-13 09:38:50.085562+00
P_x8N2rZR	HEHE	#3B8282	126.62964493078286	1105.4490750243233	2026-11-13 10:09:40.075445+00	2026-11-13 10:29:45.250182+00
qM_wn1Bz5	HEHE	#3B8282	25	1365	2026-11-13 10:29:48.698159+00	2026-11-13 10:29:49.105542+00
vbIMQcZ6j	HEHE	#3B8282	25	1365	2026-11-13 10:29:50.113968+00	2026-11-13 10:30:03.063644+00
RdMEZfuNG	HEHE	#3B8282	25	1365	2026-11-16 04:11:56.829282+00	2026-11-16 04:11:57.958852+00
VfEvnit4Y	HEHE	#3B8282	25	1365	2026-11-13 09:17:55.096144+00	2026-11-13 09:17:56.339181+00
emVtC-AAW	HEHE	#3B8282	25	1365	2026-11-13 10:30:03.792198+00	2026-11-13 10:30:04.992068+00
CAhc3hi9N	Admin	#3B8282	25	1365	2026-11-15 03:56:21.025767+00	2026-11-15 03:56:21.494522+00
IVfpV8nK-	HEHE	#3B8282	25	1365	2026-11-13 10:30:05.726745+00	2026-11-13 10:30:06.972124+00
cqG0LlMz3	Admin	#3B8282	233.8409176020711	1372.4951026409362	2026-11-16 02:18:18.80854+00	2026-11-16 02:18:27.228239+00
XoF14zBIG	HEHE	#3B8282	25	1365	2026-11-13 09:17:56.834313+00	2026-11-13 09:18:20.329229+00
QLSYoglcf	HEHE	#3B8282	25	1365	2026-11-13 09:18:20.935777+00	2026-11-13 09:18:22.315006+00
Jr_4Phc1q	HEHE	#3B8282	25	1365	2026-11-13 09:18:22.772246+00	2026-11-13 09:18:24.315646+00
EUg93lhN3	Admin	#3B8282	25	1365	2026-11-15 03:56:20.192625+00	2026-11-15 03:56:29.012357+00
8e4hGvZB-	Admin	#3B8282	456.76675439743354	1337.6224273197624	2026-11-13 03:19:18.400839+00	2026-11-13 03:42:09.578206+00
pq_sG8vTx	HEHE	#3B8282	25	1365	2026-11-13 02:00:15.595744+00	2026-11-13 03:42:10.800426+00
Atd_DMZlg	HEHE	#3B8282	25	1365	2026-11-13 09:18:24.937442+00	2026-11-13 09:18:26.316054+00
zg39jef9c	HEHE	#3B8282	25	1365	2026-11-13 03:42:11.970478+00	2026-11-13 03:42:29.647343+00
9aYP9K93p	HEHE	#3B8282	25	1365	2026-11-13 09:18:26.698355+00	2026-11-13 09:18:28.30598+00
UkVDm1eCu	Admin	#3B8282	25	1365	2026-11-13 03:45:13.375998+00	2026-11-13 03:45:25.404709+00
U_JXGiOkA	HEHE	#3B8282	25	1365	2026-11-13 09:18:50.874816+00	2026-11-13 09:18:52.305461+00
plRJOdRba	HEHE	#3B8282	25	1365	2026-11-13 09:18:52.746732+00	2026-11-13 09:18:54.317342+00
HwWLHkVDv	Admin	#3B8282	612.7725675531846	1372.4969425803654	2026-11-13 06:02:07.783939+00	2026-11-13 06:08:58.190157+00
gfS6knZ23	HEHE	#3B8282	25	1365	2026-11-16 03:45:30.035397+00	2026-11-16 03:46:07.605436+00
L5c2cZk64	HEHE	#3B8282	25	1365	2026-11-13 09:19:13.986748+00	2026-11-13 09:19:15.340939+00
DoJ4g43JI	Admin	#3B8282	25	1365	2026-11-13 06:08:58.798138+00	2026-11-13 06:09:01.339508+00
NDNw2AWk1	HEHE	#3B8282	25	1365	2026-11-13 06:09:01.193422+00	2026-11-13 06:09:02.432085+00
THnWDofcT	Admin	#3B8282	25	1365	2026-11-15 03:56:24.351342+00	2026-11-15 03:57:02.156583+00
g-2YzXZCC	HEHE	#3B8282	25	1365	2026-11-13 06:09:03.078725+00	2026-11-13 06:09:04.451759+00
x0wpZcZQ6	Admin	#3B8282	25	1365	2026-11-13 06:09:03.154027+00	2026-11-13 06:09:04.600415+00
c4ydviKWQ	Admin	#3B8282	25	1365	2026-11-15 04:01:42.897539+00	2026-11-15 04:01:44.422936+00
2C2a4SCPJ	HEHE	#3B8282	25	1365	2026-11-13 09:19:20.896714+00	2026-11-13 09:19:40.301525+00
JFcapN_SX	Admin	#3B8282	25	1365	2026-11-15 04:01:45.873944+00	2026-11-15 04:01:49.567723+00
czDlK-U7L	Admin	#3B8282	25	1365	2026-11-13 04:50:27.617148+00	2026-11-13 04:53:46.876489+00
xXHHQ7Xba	HEHE	#3B8282	25	1365	2026-11-16 03:48:03.110054+00	2026-11-16 03:48:29.873533+00
qQxkjtwi6	Admin	#3B8282	25	1365	2026-11-15 04:01:51.181742+00	2026-11-15 04:02:07.928623+00
uWTFyz2k8	HEHE	#3B8282	25	1365	2026-11-16 03:48:30.781136+00	2026-11-16 03:48:36.766539+00
PtVEjVuJv	HEHE	#3B8282	25	1365	2026-11-13 09:32:49.454508+00	2026-11-13 09:33:39.110835+00
kvg-g40Gi	HEHE	#3B8282	25	1365	2026-11-13 09:34:01.72336+00	2026-11-13 09:34:06.048606+00
6xa6Hexi7	HEHE	#3B8282	25	1365	2026-11-16 03:49:35.552205+00	2026-11-16 03:49:36.721995+00
1gkYWXxAP	HEHE	#3B8282	25	1365	2026-11-13 09:34:06.660557+00	2026-11-13 09:34:08.195442+00
Ws5JBIyks	HEHE	#3B8282	25	1365	2026-11-13 09:34:08.965909+00	2026-11-13 09:34:10.096558+00
aRVPqEyoC	HEHE	#3B8282	25	1365	2026-11-13 09:44:29.383766+00	2026-11-13 09:47:28.01619+00
ZtxVitqHP	HEHE	#3B8282	25	1365	2026-11-13 09:34:10.746292+00	2026-11-13 09:34:11.061578+00
HShjKoSEz	HEHE	#3B8282	25	1365	2026-11-13 09:47:28.460641+00	2026-11-13 09:47:30.014093+00
odbu0fCHD	HEHE	#3B8282	25	1365	2026-11-13 09:34:11.684635+00	2026-11-13 09:34:19.011158+00
wIvhocDFO	HEHE	#3B8282	25	1365	2026-11-16 03:49:37.353101+00	2026-11-16 03:49:46.740461+00
TIX3-BPAi	HEHE	#3B8282	25	1365	2026-11-13 09:34:19.364352+00	2026-11-13 09:34:30.049243+00
LEAjlCPmE	HEHE	#3B8282	25	1365	2026-11-13 09:34:30.349189+00	2026-11-13 09:34:32.044922+00
Xy6vsQIK_	HEHE	#3B8282	25	1365	2026-11-13 10:50:52.907256+00	2026-11-13 10:55:52.446404+00
m-PD3pJqG	Admin	#3B8282	25	1365	2026-11-13 15:40:12.582088+00	2026-11-13 15:40:17.251015+00
z87Eaawyz	HEHE	#3B8282	25	1365	2026-11-13 10:39:53.196218+00	2026-11-13 10:44:52.212287+00
T8NDygaoC	Admin	#3B8282	25	1365	2026-11-15 03:38:50.104968+00	2026-11-15 03:39:01.23585+00
xMroKlXWQ	Admin	#3B8282	781.0960785412193	1375.6861119341509	2026-11-15 03:43:23.541923+00	2026-11-15 03:43:36.012342+00
qPOhPkbHc	Admin	#3B8282	25	1365	2026-11-15 03:50:55.214945+00	2026-11-15 03:50:56.031578+00
O4qZNzgaq	Admin	#3B8282	25	1365	2026-11-15 03:51:23.633243+00	2026-11-15 03:51:24.545168+00
W5-7LTRxF	Admin	#3B8282	25	1365	2026-11-15 03:51:28.220111+00	2026-11-15 03:51:30.135808+00
GhfGmX7Th	Admin	#3B8282	25	1365	2026-11-15 03:51:32.115271+00	2026-11-15 03:51:32.62053+00
xdXnW-B3o	Admin	#3B8282	25	1365	2026-11-15 03:51:33.820698+00	2026-11-15 03:51:48.457483+00
ryVxY8T9V	Admin	#3B8282	25	1365	2026-11-15 03:51:59.139638+00	2026-11-15 03:51:59.90412+00
PFyoQuqA8	Admin	#3B8282	653.3695599999992	1365	2026-11-13 09:39:25.153985+00	2026-11-13 09:44:03.077815+00
AMG3v1r8X	HEHE	#3B8282	25	1365	2026-11-16 01:36:10.98633+00	2026-11-16 01:42:28.76538+00
w2WeOJhfz	HEHE	#3B8282	25	1365	2026-11-13 09:44:04.753189+00	2026-11-13 09:44:14.059468+00
LcBWjcdjv	HEHE	#3B8282	25	1365	2026-11-16 02:25:29.870382+00	2026-11-16 02:31:28.942407+00
E3_WMtr6E	HEHE	#3B8282	25	1365	2026-11-13 06:09:05.069688+00	2026-11-13 06:31:14.45433+00
XpFnyyAbx	HEHE	#3B8282	25	1365	2026-11-13 09:44:14.590285+00	2026-11-13 09:44:16.030147+00
OaJpmiXlJ	HEHE	#3B8282	25	1365	2026-11-13 06:31:20.96117+00	2026-11-13 06:31:25.415145+00
oSFEkZbF8	HEHE	#3B8282	25	1365	2026-11-13 06:32:52.306215+00	2026-11-13 06:32:53.484629+00
uzyBwm3Lr	HEHE	#3B8282	25	1365	2026-11-13 09:44:16.356289+00	2026-11-13 09:44:26.032689+00
WWVo75L0C	HEHE	#3B8282	25	1365	2026-11-13 06:33:10.052206+00	2026-11-13 06:33:10.639765+00
k4ONs0L7E	HEHE	#3B8282	25	1365	2026-11-13 06:33:34.108563+00	2026-11-13 06:33:35.42926+00
QKQ6J8Ahg	HEHE	#3B8282	25	1365	2026-11-13 09:44:26.404521+00	2026-11-13 09:44:28.029838+00
mTVfh5q_r	HEHE	#3B8282	25	1365	2026-11-13 09:44:28.539348+00	2026-11-13 09:44:28.99696+00
9vmW2w3Zd	HEHE	#3B8282	25	1365	2026-11-13 06:33:36.154638+00	2026-11-13 06:33:52.448259+00
Fv3nwtNCP	HEHE	#3B8282	25	1365	2026-11-13 06:33:52.979625+00	2026-11-13 06:33:54.431785+00
DK_dNFZ6R	HEHE	#3B8282	25	1365	2026-11-13 06:33:55.023859+00	2026-11-13 06:33:55.422536+00
0pqPLZvb3	HEHE	#3B8282	25	1365	2026-11-13 06:34:45.907888+00	2026-11-13 06:34:55.438105+00
N_bPlwD3s	HEHE	#3B8282	25	1365	2026-11-13 06:34:55.840489+00	2026-11-13 06:35:29.484377+00
fGmeAZ13m	HEHE	#3B8282	25	1365	2026-11-13 06:35:32.049368+00	2026-11-13 06:35:32.423728+00
I4G9iJ_bQ	HEHE	#3B8282	702.1665936713226	416.08958169258904	2026-11-16 01:42:57.967277+00	2026-11-16 01:48:28.819287+00
f7-9tBMGH	HEHE	#3B8282	25	1365	2026-11-16 02:42:29.384338+00	2026-11-16 02:48:28.84648+00
UbdLNxoVr	Admin	#3B8282	730.4039826482947	1321.2317265882386	2026-11-13 03:47:24.756964+00	2026-11-13 04:07:10.624831+00
immx2vQvb	Admin	#3B8282	1068.7064824347804	876.0263975652159	2026-11-16 02:58:59.457911+00	2026-11-16 03:02:24.403649+00
VAf2rOJcW	Admin	#3B8282	724.5554418774354	1318.6792505006665	2026-11-13 06:37:46.589773+00	2026-11-13 06:46:16.114368+00
7NW0Xo4cR	HEHE	#3B8282	25	1365	2026-11-13 06:47:51.326226+00	2026-11-13 06:47:56.462351+00
WapSMRR3e	HEHE	#3B8282	25	1365	2026-11-13 06:48:08.633726+00	2026-11-13 06:48:19.471091+00
dudp_mB8v	HEHE	#3B8282	25	1365	2026-11-13 06:48:24.396651+00	2026-11-13 06:48:26.570075+00
Dp0wjes37	Admin	#3B8282	85.50210348478964	1545.9529903225452	2026-11-15 04:02:31.777133+00	2026-11-15 04:18:55.798048+00
ZYioeiS4_	Admin	#3B8282	25	1365	2026-11-15 04:19:01.283677+00	2026-11-15 04:19:03.969662+00
2mFPjXsLS	Admin	#3B8282	25	1365	2026-11-15 04:19:06.476129+00	2026-11-15 04:19:06.511998+00
W2R-2tY4L	HEHE	#3B8282	25	1365	2026-11-16 01:48:29.760101+00	2026-11-16 01:54:28.956568+00
OP4n0QQzJ	Admin	#3B8282	25	1365	2026-11-15 04:19:09.266697+00	2026-11-15 04:19:10.613107+00
DvtcAAoGT	Admin	#3B8282	25	1365	2026-11-15 04:19:13.085964+00	2026-11-15 04:19:17.722599+00
EOZ8dDT0u	Admin	#3B8282	25	1365	2026-11-13 03:44:32.847058+00	2026-11-13 03:44:35.01974+00
DZnXnHzAN	Admin	#3B8282	25	1365	2026-11-15 03:56:22.568654+00	2026-11-15 03:56:23.383815+00
OEBmxLfGn	Admin	#3B8282	25	1365	2026-11-15 04:02:09.614877+00	2026-11-15 04:02:09.614877+00
9zo8JiMTx	HEHE	#3B8282	25	1365	2026-11-16 04:12:01.795928+00	2026-11-16 04:12:03.114534+00
04o2LZpe2	Admin	#3B8282	25	1365	2026-11-15 04:18:57.898481+00	2026-11-15 04:19:00.060083+00
xpcH7_zgT	Admin	#3B8282	25	1365	2026-11-16 09:29:50.261956+00	2026-11-16 09:29:50.261956+00
vA9aIULUI	Admin	#3B8282	571.0576483066875	1372.491065905654	2026-11-13 02:08:59.274505+00	2026-11-13 03:19:07.161533+00
7kEbOOroR	HEHE	#3B8282	25	1365	2026-11-16 03:46:08.276602+00	2026-11-16 03:46:21.895897+00
8fC8p-dKE	Admin	#3B8282	25	1365	2026-11-13 03:44:35.541605+00	2026-11-13 03:45:12.205821+00
OEwjcZDKD	Admin	#3B8282	78.66147833906025	1515.4825798551778	2026-11-15 04:20:15.659161+00	2026-11-15 04:24:38.674557+00
pABR2xmUx	HEHE	#3B8282	25	1365	2026-11-13 03:45:13.692528+00	2026-11-13 03:45:25.611828+00
rsyQ2_7Tb	HEHE	#3B8282	25	1365	2026-11-16 04:12:04.684519+00	2026-11-16 04:12:22.925791+00
VT3fzCB5Z	Admin	#3B8282	25	1365	2026-11-15 04:25:38.923663+00	2026-11-15 04:25:40.740888+00
qx_1R8nhH	Admin	#3B8282	25	1365	2026-11-15 04:25:48.013901+00	2026-11-15 04:25:51.261298+00
6AFLwUnxM	Admin	#3B8282	25	1365	2026-11-13 05:07:54.342071+00	2026-11-13 05:14:13.564438+00
t2PC5mt4Q	Admin	#3B8282	25	1365	2026-11-15 04:35:29.411971+00	2026-11-15 04:35:30.270297+00
wKUnmYwiW	HEHE	#3B8282	25	1365	2026-11-13 03:50:18.340816+00	2026-11-13 06:08:58.654993+00
cjD_gZ4cA	Admin	#3B8282	374.16417211000277	1217.3025478899967	2026-11-16 03:48:37.029463+00	2026-11-16 03:49:15.857847+00
O90PCQRPJ	HEHE	#3B8282	25	1365	2026-11-13 06:08:59.851425+00	2026-11-13 06:09:00.529312+00
b9F5CEJeI	HEHE	#3B8282	25	1365	2026-11-16 05:35:19.839271+00	2026-11-16 06:36:47.3752+00
jivUCt7Y1	Admin	#3B8282	25	1365	2026-11-13 06:09:01.917869+00	2026-11-13 06:09:02.444106+00
00HWNoWHM	Admin	#3B8282	25	1365	2026-11-16 03:49:16.374941+00	2026-11-16 03:49:17.450334+00
hgjlxsTp8	Admin	#3B8282	25	1365	2026-11-16 06:37:32.983431+00	2026-11-16 06:37:34.200585+00
_6LZBLJSC	Admin	#3B8282	25	1365	2026-11-16 03:49:17.937918+00	2026-11-16 03:49:18.916641+00
B-bYe0400	HEHE	#3B8282	25	1365	2026-11-16 03:49:47.913289+00	2026-11-16 03:49:48.67898+00
HPQxkN7de	HEHE	#3B8282	1436.3236791216686	755.686720878327	2026-11-16 02:19:40.261851+00	2026-11-16 02:21:34.701307+00
vg2A1oNA4	Admin	#3B8282	25	1365	2026-11-16 03:49:47.331804+00	2026-11-16 03:49:48.79052+00
1oY22SA5e	HEHE	#3B8282	25	1365	2026-11-16 03:49:49.239106+00	2026-11-16 03:49:50.778738+00
GbdiBYeNq	Admin	#3B8282	25	1365	2026-11-16 03:49:50.522884+00	2026-11-16 03:49:52.085629+00
Afj7GIChz	HEHE	#3B8282	25	1365	2026-11-13 10:44:52.744919+00	2026-11-13 10:50:52.387092+00
cpTiZ8gMX	HEHE	#3B8282	25	1365	2026-11-16 03:51:01.44512+00	2026-11-16 03:51:02.756582+00
rkUDep1nQ	Admin	#3B8282	191.6480126673162	1357.3399897453805	2026-11-16 04:14:44.860778+00	2026-11-16 04:15:49.873351+00
tFoFz94bx	HEHE	#3B8282	25	1365	2026-11-16 03:51:05.296572+00	2026-11-16 03:51:05.97878+00
ONDwlhCTJ	HEHE	#3B8282	25	1365	2026-11-16 03:51:07.494083+00	2026-11-16 03:51:13.618052+00
cbM0pHvco	HEHE	#3B8282	25	1365	2026-11-13 10:30:07.471636+00	2026-11-13 10:34:52.615459+00
FRmubVcdE	Admin	#3B8282	547.5998083445372	983.1517116554583	2026-11-16 05:41:18.610939+00	2026-11-16 05:43:48.02876+00
dQi8qqQYC	Admin	#3B8282	476.1209906387235	1368.0948988417645	2026-11-16 07:04:57.244458+00	2026-11-16 07:12:53.73909+00
Fv72xdigo	Admin	#3B8282	180.48035175867122	1486.8980119852033	2026-11-16 07:12:55.057354+00	2026-11-16 07:13:35.12938+00
vphLOGlOx	HEHE	#3B8282	25	1365	2026-11-16 07:26:31.323442+00	2026-11-16 07:26:44.931679+00
EsY8_SAvG	HEHE	#3B8282	25	1365	2026-11-16 03:55:26.656648+00	2026-11-16 03:59:26.948215+00
vKVsaVaxL	HEHE	#3B8282	25	1365	2026-11-13 10:55:52.9966+00	2026-11-13 11:00:34.265877+00
W7b6PvCuf	Admin	#3B8282	617.9498715977785	871.6249284022188	2026-11-16 04:11:36.364634+00	2026-11-16 04:11:44.290565+00
0RAmOPa5S	Admin	#3B8282	25	1365	2026-11-16 04:11:46.871161+00	2026-11-16 04:11:46.964583+00
hDrykgVIV	Admin	#3B8282	93.62674338240501	1597.5285446946289	2026-11-15 04:42:30.482542+00	2026-11-15 04:49:31.666417+00
vc_zWY717	HEHE	#3B8282	25	1365	2026-11-16 02:31:29.789991+00	2026-11-16 02:37:28.761381+00
uiE_tVwGP	Admin	#3B8282	25	1365	2026-11-15 04:49:38.704849+00	2026-11-15 04:49:39.176618+00
qUWdCL1VZ	Admin	#3B8282	25	1365	2026-11-15 04:49:40.45106+00	2026-11-15 04:49:42.380046+00
_WKocTGZm	Admin	#3B8282	1368.8465065927576	1418.3086772076645	2026-11-13 06:09:05.094828+00	2026-11-13 06:31:14.024629+00
We24r7bDo	HEHE	#3B8282	25	1365	2026-11-13 06:32:21.430317+00	2026-11-13 06:32:22.49627+00
_Lx3Dapiw	HEHE	#3B8282	25	1365	2026-11-13 06:32:54.083919+00	2026-11-13 06:33:07.490762+00
DpgSDiM8B	HEHE	#3B8282	25	1365	2026-11-13 06:33:11.836827+00	2026-11-13 06:33:33.479446+00
cMTcTrdSg	HEHE	#3B8282	25	1365	2026-11-13 06:33:59.045605+00	2026-11-13 06:34:21.552196+00
4xsB4nIbh	HEHE	#3B8282	25	1365	2026-11-13 06:34:23.98478+00	2026-11-13 06:34:24.432245+00
bmklo0mNa	HEHE	#3B8282	25	1365	2026-11-13 06:34:28.814469+00	2026-11-13 06:34:30.430143+00
pTWWeHoVm	HEHE	#3B8282	25	1365	2026-11-13 06:35:29.938316+00	2026-11-13 06:35:31.424053+00
3GVTjsy3C	HEHE	#3B8282	25	1365	2026-11-13 06:35:32.789576+00	2026-11-13 06:35:34.46251+00
RQ9QJ5L4E	Admin	#3B8282	179.6333513169355	1372.574554645732	2026-11-16 07:29:47.728977+00	2026-11-16 07:34:53.174207+00
ebvNlN2v5	Admin	#3B8282	25	1365	2026-11-16 07:38:07.317742+00	2026-11-16 07:38:08.966394+00
G7mBLZ3Ij	HEHE	#3B8282	25	1365	2026-11-16 02:48:29.360258+00	2026-11-16 02:53:29.046523+00
RrAxweKY7	Admin	#3B8282	484.16137590847165	1314.646673538733	2026-11-16 04:15:53.026347+00	2026-11-16 04:25:29.664599+00
3SwkGRnVr	Admin	#3B8282	25	1365	2026-11-16 03:02:25.122536+00	2026-11-16 03:02:42.076587+00
2J2j6VsFn	HEHE	#3B8282	25	1365	2026-11-16 04:43:45.341602+00	2026-11-16 04:43:56.488885+00
Uj6tbUWsM	Admin	#3B8282	1069.866965923122	708.4079520015462	2026-11-15 12:09:58.370577+00	2026-11-15 12:27:56.653535+00
E5VUrkZjt	HEHE	#3B8282	25	1365	2026-11-16 01:42:29.350204+00	2026-11-16 01:42:56.936133+00
nlXi1ruKJ	HEHE	#3B8282	25	1365	2026-11-13 06:41:18.297399+00	2026-11-13 06:46:17.901954+00
jhWSRbzTF	HEHE	#3B8282	25	1365	2026-11-13 06:47:57.114916+00	2026-11-13 06:48:07.587485+00
FkdQn4R70	HEHE	#3B8282	25	1365	2026-11-13 06:48:20.646348+00	2026-11-13 06:48:21.44835+00
xknUvSBnj	HEHE	#3B8282	25	1365	2026-11-13 06:48:27.428568+00	2026-11-13 06:48:39.749939+00
LTlTiOnmY	Admin	#3B8282	774.2520105128335	1343.3897742303493	2026-11-13 06:49:56.646894+00	2026-11-13 09:16:26.1739+00
4wKJNc8DK	HEHE	#3B8282	25	1365	2026-11-13 06:53:18.260563+00	2026-11-13 09:16:26.694017+00
nWaIvFSy7	HEHE	#3B8282	25	1365	2026-11-13 09:18:28.667661+00	2026-11-13 09:18:30.307363+00
ZvzWnAF_P	HEHE	#3B8282	25	1365	2026-11-13 09:18:30.743191+00	2026-11-13 09:18:31.294427+00
Ydn7Im477	HEHE	#3B8282	25	1365	2026-11-13 09:18:31.697265+00	2026-11-13 09:18:45.332346+00
7LMZwRNws	HEHE	#3B8282	25	1365	2026-11-13 09:18:46.023698+00	2026-11-13 09:18:47.359941+00
xR8yeYXtJ	HEHE	#3B8282	25	1365	2026-11-13 09:18:47.815077+00	2026-11-13 09:18:48.308272+00
T1Zim4yEn	HEHE	#3B8282	25	1365	2026-11-13 09:18:54.789312+00	2026-11-13 09:18:55.313232+00
L0_zKhGJO	HEHE	#3B8282	25	1365	2026-11-13 09:19:16.189673+00	2026-11-13 09:19:17.379644+00
7FBpu_qW1	HEHE	#3B8282	25	1365	2026-11-13 09:33:40.193326+00	2026-11-13 09:33:52.164462+00
MEU34hjMw	HEHE	#3B8282	25	1365	2026-11-13 09:33:52.67672+00	2026-11-13 09:33:54.055972+00
CPyA-jDTp	HEHE	#3B8282	25	1365	2026-11-13 09:33:54.792104+00	2026-11-13 09:33:55.026385+00
gO087zfkL	HEHE	#3B8282	220.6360478981761	1503.551282227144	2026-11-13 10:09:17.699122+00	2026-11-13 10:09:34.944605+00
izmy6TnyS	HEHE	#3B8282	25	1365	2026-11-13 09:33:55.599349+00	2026-11-13 09:33:57.084756+00
00DS-EJES	HEHE	#3B8282	25	1365	2026-11-13 09:33:57.61577+00	2026-11-13 09:33:59.0704+00
EAiw-uqOW	HEHE	#3B8282	25	1365	2026-11-13 09:34:32.33928+00	2026-11-13 09:34:34.048048+00
CF1wVGf67	HEHE	#3B8282	25	1365	2026-11-16 01:54:29.909224+00	2026-11-16 01:59:28.786127+00
EHRapUG_K	HEHE	#3B8282	25	1365	2026-11-13 09:34:34.452435+00	2026-11-13 09:34:35.0166+00
rPFMjaOgW	HEHE	#3B8282	25	1365	2026-11-13 09:34:35.343537+00	2026-11-13 09:34:38.065219+00
XWkXphMo-	HEHE	#3B8282	25	1365	2026-11-16 02:05:29.82939+00	2026-11-16 02:10:28.799561+00
rtLZ96oh1	HEHE	#3B8282	25	1365	2026-11-13 09:38:50.531881+00	2026-11-13 09:44:04.06232+00
eizFOci9U	Dauss	#3B8282	1225	915	2026-11-16 08:47:57.692041+00	2026-11-16 08:48:04.486052+00
Pmqx-m1PJ	HEHE	#3B8282	25	1365	2026-11-16 04:12:24.308123+00	2026-11-16 04:12:29.803927+00
izYo0KgLG	HEHE	#3B8282	25	1365	2026-11-13 11:00:35.580306+00	2026-11-13 11:00:46.805643+00
5PGZF3bMb	Admin	#3B8282	230.8425199999999	1365	2026-11-16 01:42:43.992398+00	2026-11-16 01:42:52.75757+00
2yiXob53M	HEHE	#3B8282	25	1365	2026-11-16 04:12:30.83877+00	2026-11-16 04:12:30.887185+00
tm82JuFki	Admin	#3B8282	384.92276876756495	1372.4939838200708	2026-11-16 03:47:08.193055+00	2026-11-16 03:47:57.419984+00
HM5DHoP_e	Admin	#3B8282	117.57223705077726	1329.9167867128165	2026-11-15 03:52:13.106288+00	2026-11-15 03:56:18.987435+00
kwRlxz8n6	Dauss	#3B8282	1225	915	2026-11-16 07:41:44.307042+00	2026-11-16 07:42:36.359616+00
NJLxlRHzq	Admin	#3B8282	501.33301696227136	919.4494325008513	2026-11-16 06:03:37.371703+00	2026-11-16 06:36:47.375213+00
zR5zUS9FH	HEHE	#3B8282	25	1365	2026-11-16 06:37:34.480527+00	2026-11-16 06:37:34.972247+00
1gcsnZqd2	Dauss	#3B8282	25	1365	2026-11-16 07:45:11.338357+00	2026-11-16 07:45:12.10296+00
n39IWYDxq	HEHE	#3B8282	25	1365	2026-11-16 03:48:37.238269+00	2026-11-16 03:49:16.716111+00
G-dSqxYpL	HEHE	#3B8282	25	1365	2026-11-16 03:49:17.291705+00	2026-11-16 03:49:19.256264+00
6N0I8NQyj	Admin	#3B8282	25	1365	2026-11-16 07:45:12.916216+00	2026-11-16 07:45:14.023726+00
ot_lBZbPw	HEHE	#3B8282	25	1365	2026-11-16 07:45:13.630008+00	2026-11-16 07:45:14.444744+00
jfYzmPnP3	Admin	#3B8282	25	1365	2026-11-16 03:49:32.459192+00	2026-11-16 03:49:33.676978+00
edwNJRuQK	HEHE	#3B8282	25	1365	2026-11-16 03:49:32.464713+00	2026-11-16 03:49:34.767201+00
2P_DGOzOp	Admin	#3B8282	25	1365	2026-11-16 03:49:49.535215+00	2026-11-16 03:49:49.917973+00
tGtnxhhde	Admin	#3B8282	368.43957504138416	997.5594918090899	2026-11-16 05:32:21.918678+00	2026-11-16 05:39:39.026858+00
XNF8tkF_9	HEHE	#3B8282	25	1365	2026-11-16 03:49:51.364559+00	2026-11-16 03:49:51.986176+00
EU2XsPIzS	HEHE	#3B8282	25	1365	2026-11-16 03:49:52.695358+00	2026-11-16 03:49:53.704628+00
f0umLFvMz	HEHE	#3B8282	25	1365	2026-11-16 03:49:54.458329+00	2026-11-16 03:49:55.214157+00
X8yphmvKB	HEHE	#3B8282	25	1365	2026-11-16 03:49:56.791036+00	2026-11-16 03:50:03.817936+00
sBBjC9TKJ	HEHE	#3B8282	25	1365	2026-11-16 03:50:04.508937+00	2026-11-16 03:50:05.740979+00
b0cfP_bg2	HEHE	#3B8282	368.42659615190246	110.47913867083496	2026-11-16 02:10:29.549819+00	2026-11-16 02:19:40.132714+00
GG3Sd0Jh4	HEHE	#3B8282	25	1365	2026-11-16 03:50:06.487934+00	2026-11-16 03:50:07.064561+00
2qjr5vP1d	HEHE	#3B8282	25	1365	2026-11-16 03:50:08.44074+00	2026-11-16 03:50:09.698452+00
tZaMZGLa0	HEHE	#3B8282	25	1365	2026-11-16 03:50:10.404258+00	2026-11-16 03:50:10.995298+00
hujfXYseW	HEHE	#3B8282	25	1365	2026-11-16 03:50:11.79026+00	2026-11-16 03:50:34.692362+00
V3QRIYYep	HEHE	#3B8282	25	1365	2026-11-16 03:50:35.484797+00	2026-11-16 03:51:00.723973+00
VgnpKZm2o	Admin	#3B8282	164.5653102607542	1512.484111461251	2026-11-15 03:57:03.324371+00	2026-11-15 04:01:41.120524+00
NHYPBaUTn	Admin	#3B8282	25	1365	2026-11-15 04:02:28.694275+00	2026-11-15 04:02:30.395889+00
dxe_7YSqy	Admin	#3B8282	25	1365	2026-11-15 04:19:07.292164+00	2026-11-15 04:19:07.87227+00
bO98n2Fv3	Admin	#3B8282	25	1365	2026-11-15 04:19:11.406762+00	2026-11-15 04:19:11.870607+00
hQfMQdpmp	Admin	#3B8282	25	1365	2026-11-15 04:25:22.121786+00	2026-11-15 04:25:23.982175+00
jL0ig6joy	HEHE	#3B8282	25	1365	2026-11-16 01:59:29.399788+00	2026-11-16 02:05:28.830961+00
AKgmGmT1l	Admin	#3B8282	25	1365	2026-11-15 04:25:28.450304+00	2026-11-15 04:25:37.592362+00
MA-L9vUUJ	Admin	#3B8282	25	1365	2026-11-15 04:25:42.152485+00	2026-11-15 04:25:43.906912+00
0kHmHl84b	Admin	#3B8282	25	1365	2026-11-15 04:25:46.167731+00	2026-11-15 04:25:46.583039+00
R53Kt_Z_v	Admin	#3B8282	180.97556000000077	1365	2026-11-16 04:25:31.410948+00	2026-11-16 04:30:53.451016+00
3JE5kguBm	Admin	#3B8282	169.77539349373282	1440.8906389820377	2026-11-13 15:40:19.084207+00	2026-11-13 16:06:53.529455+00
Y6mlhVVIe	HEHE	#3B8282	25	1365	2026-11-16 02:21:34.884205+00	2026-11-16 02:25:28.779343+00
iW53jSVXX	Admin	#3B8282	25	1365	2026-11-15 03:39:04.559938+00	2026-11-15 03:39:08.55278+00
xTV3I_rj1	Admin	#3B8282	25	1365	2026-11-16 05:12:26.617395+00	2026-11-16 05:12:45.745718+00
NV80u0K0t	Admin	#3B8282	99.03111383478792	1027.1712430602806	2026-11-16 07:50:43.919364+00	2026-11-16 08:05:35.205586+00
nys9Xoq0R	Admin	#3B8282	25	1365	2026-11-16 08:05:35.970077+00	2026-11-16 08:05:58.512829+00
iVru73nTK	Dauss	#3B8282	25	1365	2026-11-16 08:05:59.462491+00	2026-11-16 08:05:59.924396+00
RkS_dZf44	HEHE	#3B8282	25	1365	2026-11-16 03:59:27.957678+00	2026-11-16 04:03:27.960356+00
aAM5KmukK	HEHE	#3B8282	25	1365	2026-11-16 08:05:36.852102+00	2026-11-16 08:06:00.827134+00
rWj9756H-	HEHE	#3B8282	25	1365	2026-11-16 04:11:37.521047+00	2026-11-16 04:11:45.035414+00
EPsDZe1Bp	Dauss	#3B8282	73.92211425583119	1049.9302092607209	2026-11-16 08:06:01.006197+00	2026-11-16 08:06:52.996874+00
4AXIoMe40	Dauss	#3B8282	25	1365	2026-11-16 08:06:53.933771+00	2026-11-16 08:06:54.506378+00
I1-KjLVIM	HEHE	#3B8282	25	1365	2026-11-16 08:06:54.345302+00	2026-11-16 08:06:55.397709+00
3T6hzkemW	HEHE	#3B8282	25	1365	2026-11-16 02:37:29.335968+00	2026-11-16 02:42:28.772368+00
q6XrLujfJ	Admin	#3B8282	168.81055906635382	1559.7027323062619	2026-11-15 04:28:21.978478+00	2026-11-15 04:35:26.688765+00
1Y2Iu654h	Admin	#3B8282	172.09725134573753	1401.9942130292634	2026-11-15 03:44:13.905501+00	2026-11-15 03:50:53.901246+00
r9qkPo8CN	Admin	#3B8282	25	1365	2026-11-15 03:50:58.094147+00	2026-11-15 03:50:59.38151+00
TO_WP6yeR	Admin	#3B8282	25	1365	2026-11-15 03:51:00.623774+00	2026-11-15 03:51:03.578009+00
aeQMQstDA	Admin	#3B8282	25	1365	2026-11-15 03:51:05.145798+00	2026-11-15 03:51:17.917728+00
ii_RBTQNJ	Admin	#3B8282	303.9072909779183	1227.984857231994	2026-11-13 09:48:51.308952+00	2026-11-13 10:29:44.830586+00
I5xoHin2-	Admin	#3B8282	25	1365	2026-11-15 03:51:25.422785+00	2026-11-15 03:51:26.984314+00
4YI4X14Sl	Admin	#3B8282	25	1365	2026-11-15 03:51:22.794282+00	2026-11-15 03:51:31.294228+00
S7ur9PEBP	Admin	#3B8282	25	1365	2026-11-15 03:51:31.339777+00	2026-11-15 03:51:40.316787+00
O8q8M1iRX	Admin	#3B8282	25	1365	2026-11-15 03:51:34.541811+00	2026-11-15 03:51:43.319242+00
g9qV1m2EX	Admin	#3B8282	25	1365	2026-11-15 03:51:49.775459+00	2026-11-15 03:51:51.635937+00
6_QxUKABt	Admin	#3B8282	25	1365	2026-11-15 03:51:52.91595+00	2026-11-15 03:51:53.777151+00
GXDFPwLzB	Admin	#3B8282	25	1365	2026-11-15 03:51:54.930871+00	2026-11-15 03:51:54.981425+00
ghQUxas_k	Admin	#3B8282	25	1365	2026-11-15 03:51:55.871934+00	2026-11-15 03:51:56.490166+00
t0NdJqVUH	HEHE	#3B8282	25	1365	2026-11-16 08:12:40.093753+00	2026-11-16 08:14:16.464997+00
9OIaFIpBy	Admin	#3B8282	25	1365	2026-11-15 03:51:58.119921+00	2026-11-15 03:52:04.362667+00
XqYPR-JpJ	Admin	#3B8282	392.8400580354718	839.4677962537137	2026-11-16 05:43:48.517099+00	2026-11-16 05:55:55.799529+00
DKqEeU5dS	Admin	#3B8282	25	1365	2026-11-15 03:52:01.254715+00	2026-11-15 03:52:11.966541+00
kodsiYmtx	HEHE	#3B8282	25	1365	2026-11-16 08:14:17.281887+00	2026-11-16 08:14:18.456391+00
wSHyz0u1T	Admin	#3B8282	25	1365	2026-11-16 08:14:18.029088+00	2026-11-16 08:14:19.073027+00
mXj1JII_3	Admin	#3B8282	195.23355123675006	1372.4859897338488	2026-11-16 07:13:37.667832+00	2026-11-16 07:26:18.972097+00
G58P5i9T4	HEHE	#3B8282	25	1365	2026-11-16 07:22:47.818039+00	2026-11-16 07:26:18.979193+00
AtEKPQ0Ft	HEHE	#3B8282	25	1365	2026-11-13 10:34:53.300207+00	2026-11-13 10:39:52.604679+00
TP1hNHlU7	Admin	#3B8282	171.9542133528205	1499.9028240670448	2026-11-15 04:36:56.155875+00	2026-11-15 04:42:29.029524+00
ybNHLmx3F	Admin	#3B8282	25	1365	2026-11-15 04:49:32.707847+00	2026-11-15 04:49:34.276158+00
UDZIXYYzU	Admin	#3B8282	25	1365	2026-11-15 04:49:35.099003+00	2026-11-15 04:49:35.986263+00
wqMsOLlFK	Admin	#3B8282	25	1365	2026-11-15 04:49:36.793606+00	2026-11-15 04:49:37.696575+00
BKz2moDun	Admin	#3B8282	359.906060796692	1318.7231807966934	2026-11-16 07:27:06.174911+00	2026-11-16 07:27:43.525128+00
zAzr5rI49	Admin	#3B8282	25	1365	2026-11-15 04:49:43.275006+00	2026-11-15 04:49:58.543613+00
_y_d_f9dx	HEHE	#3B8282	25	1365	2026-11-16 02:53:30.198754+00	2026-11-16 03:02:24.691573+00
UScGFfoet	HEHE	#3B8282	25	1365	2026-11-16 03:02:25.371684+00	2026-11-16 03:02:42.669163+00
66PZra2d5	Admin	#3B8282	144.17412000000007	1365	2026-11-16 03:02:42.653134+00	2026-11-16 03:03:38.099052+00
CnYtP1c7d	Admin	#3B8282	683.0230219927996	987.8485011120539	2026-11-16 03:03:38.65134+00	2026-11-16 03:30:13.145092+00
2mz2cMmxI	HEHE	#3B8282	25	1365	2026-11-16 04:12:32.20544+00	2026-11-16 04:12:33.229386+00
gh4jNZddQ	Admin	#3B8282	25	1365	2026-11-16 06:37:35.007742+00	2026-11-16 06:37:35.313075+00
C8yh5M311	test	#3b82f6	1225	915	2026-11-16 07:18:37.259575+00	2026-11-16 07:18:38.778903+00
9zObJ4Sw9	HEHE	#3B8282	25	1365	2026-11-16 06:37:35.688444+00	2026-11-16 06:37:40.777056+00
EOZAg4zgz	HEHE	#3B8282	25	1365	2026-11-16 08:20:46.249184+00	2026-11-16 08:20:59.444638+00
McjeAoqVR	test	#3b82f6	1225	915	2026-11-16 07:22:53.337311+00	2026-11-16 07:22:54.859013+00
MJH7sunNQ	HEHE	#3B8282	25	1365	2026-11-16 09:34:40.328575+00	2026-11-16 09:34:52.540391+00
KnH7rMJ4j	test	#3b82f6	1225	915	2026-11-16 07:27:33.264957+00	2026-11-16 07:27:34.786682+00
zh0fVXIpk	Dauss	#3B8282	25	1365	2026-11-16 16:08:19.3869+00	2026-11-16 16:08:20.714366+00
uqOfq3hck	Dauss	#3B8282	25	1365	2026-11-16 16:08:20.521423+00	2026-11-16 16:08:20.95808+00
Rn5X0pxWP	HEHE	#3B8282	25	1365	2026-11-16 09:36:52.076222+00	2026-11-16 09:37:03.928046+00
H1cqP6Utb	Dauss	#3B8282	25	1365	2026-11-16 16:08:21.203502+00	2026-11-16 16:08:23.090765+00
If8LsVcLe	HEHE	#3B8282	25	1365	2026-11-16 09:37:07.098045+00	2026-11-16 09:37:18.014991+00
yFu1opTys	Dauss	#3B8282	1099.1401554635772	1484.5007759489538	2026-11-16 10:48:45.430912+00	2026-11-16 10:49:28.219296+00
WP0PgpBWg	Dauss	#3B8282	25	1365	2026-11-16 16:08:21.722182+00	2026-11-16 16:08:24.082918+00
wiw-ZfeND	Dauss	#3B8282	500.6051531378092	849.7524552658147	2026-11-16 10:57:31.155986+00	2026-11-16 10:57:43.015098+00
sryaz2SgA	Dauss	#3B8282	25	1365	2026-11-16 16:08:23.560786+00	2026-11-16 16:08:24.886537+00
L7ScR7IhA	Dauss	#3B8282	201.87993288669006	756.3689855997212	2026-11-16 13:45:12.531494+00	2026-11-16 13:45:23.83112+00
Stmyf8ekK	Dauss	#3B8282	123.31731246550689	1275.4736701342397	2026-11-16 10:12:31.204767+00	2026-11-16 10:13:44.380267+00
ccUBIcHMU	Dauss	#3B8282	25	1365	2026-11-16 16:08:25.349698+00	2026-11-16 16:08:26.804268+00
2pEO3yjTc	Dauss	#3B8282	25	1365	2026-11-16 10:13:51.016024+00	2026-11-16 10:13:51.127871+00
mAUmeipGj	Dauss	#3B8282	213.43692412011413	1326.5554475057688	2026-11-16 08:22:16.940059+00	2026-11-16 08:22:38.472513+00
5udU4VF28	Dauss	#3B8282	25	1365	2026-11-16 10:13:52.304018+00	2026-11-16 10:13:52.734311+00
24KW3R_Ls	Dauss	#3B8282	25	1365	2026-11-16 09:38:40.328011+00	2026-11-16 09:40:39.382637+00
Ic2u4JVys	Dauss	#3B8282	1385.4779861227046	1494.22634260725	2026-11-16 13:45:35.628561+00	2026-11-16 13:46:30.400597+00
2jE04t9a0	HEHE	#3B8282	25	1365	2026-11-16 08:21:00.112698+00	2026-11-16 08:23:46.56349+00
Ksm1UsdF3	Dauss	#3B8282	25	1365	2026-11-16 09:40:41.333003+00	2026-11-16 09:40:44.915845+00
YSLcDN3mC	Admin	#3B8282	557.0728744423717	597.166736597829	2026-11-16 04:30:55.084998+00	2026-11-16 04:34:43.113521+00
CW2jcgDWz	Dauss	#3B8282	25	1365	2026-11-16 13:54:10.093965+00	2026-11-16 13:54:12.528219+00
8yzwMSzri	Dauss	#3B8282	25	1365	2026-11-16 09:40:45.663651+00	2026-11-16 09:40:47.029922+00
tzSa2ZJXS	Dauss	#3B8282	25	1365	2026-11-16 09:40:47.794599+00	2026-11-16 09:41:00.070905+00
orRO-uOHr	HEHE	#3B8282	25	1365	2026-11-16 05:19:22.814595+00	2026-11-16 05:19:58.759844+00
Ylz6z-RWx	Dauss	#3B8282	25	1365	2026-11-16 09:41:00.550906+00	2026-11-16 09:41:05.139512+00
_lp_RbYbP	Dauss	#3B8282	1225	915	2026-11-16 10:13:59.604111+00	2026-11-16 10:14:23.645734+00
6kEdg8VxN	Dauss	#3B8282	201.19170405362414	1275.624898059458	2026-11-16 08:24:58.842412+00	2026-11-16 08:27:03.217457+00
-U-w8cyu9	HEHE	#3B8282	25	1365	2026-11-16 07:45:18.711667+00	2026-11-16 08:05:35.660279+00
cDlMctQrd	Dauss	#3B8282	25	1365	2026-11-16 08:27:04.032319+00	2026-11-16 08:27:04.90951+00
ELoNRm2ee	Dauss	#3B8282	201.53835934457894	834.5020431431781	2026-11-16 08:05:36.550288+00	2026-11-16 08:05:58.606877+00
VJh8fRQwA	Admin	#3B8282	25	1365	2026-11-16 08:06:54.92952+00	2026-11-16 08:06:55.495811+00
dvCKPhORo	Dauss	#3B8282	182.3981716646101	1442.015999817899	2026-11-16 07:42:36.443236+00	2026-11-16 07:45:10.503377+00
KM6YCmhKU	HEHE	#3B8282	25	1365	2026-11-16 07:38:40.093729+00	2026-11-16 07:45:11.52954+00
Mv4_tbWtE	HEHE	#3B8282	25	1365	2026-11-16 07:45:15.037417+00	2026-11-16 07:45:16.402053+00
RSd0hAOJj	Admin	#3B8282	25	1365	2026-11-16 07:45:16.599682+00	2026-11-16 07:45:16.897208+00
HQCUAeUXv	HEHE	#3B8282	25	1365	2026-11-16 07:31:00.116421+00	2026-11-16 07:38:07.464747+00
SWurvMaq7	HEHE	#3B8282	25	1365	2026-11-16 07:38:08.104451+00	2026-11-16 07:38:09.43417+00
BQeFY7Db9	HEHE	#3B8282	25	1365	2026-11-16 07:45:17.082044+00	2026-11-16 07:45:17.693221+00
1JJdkJII3	Dauss	#3B8282	25	1365	2026-11-16 07:38:09.553968+00	2026-11-16 07:38:10.567433+00
hT0IQfRGI	Dauss	#3B8282	1385.3889039237051	415.71079774090555	2026-11-16 09:42:08.966912+00	2026-11-16 09:42:47.300842+00
-Vrqa2ul6	Dauss	#3B8282	25	1365	2026-11-16 07:38:11.369581+00	2026-11-16 07:38:29.209323+00
FYhdJVMRP	HEHE	#3B8282	25	1365	2026-11-16 07:38:30.02086+00	2026-11-16 07:38:31.380356+00
xLVGFlLvc	HEHE	#3B8282	25	1365	2026-11-16 07:38:33.770571+00	2026-11-16 07:38:34.499152+00
n4AjG6VCN	HEHE	#3B8282	25	1365	2026-11-16 07:38:36.684127+00	2026-11-16 07:38:37.449838+00
MLs2xFf5q	HEHE	#3B8282	25	1365	2026-11-16 03:02:43.382111+00	2026-11-16 03:43:57.188779+00
ZBVc4qDBc	Admin	#3B8282	25	1365	2026-11-16 03:47:58.104945+00	2026-11-16 03:47:59.179074+00
zH8MkgiTo	Admin	#3B8282	25	1365	2026-11-16 07:46:58.60122+00	2026-11-16 07:46:59.318576+00
5jA3_1HJS	Admin	#3B8282	25	1365	2026-11-16 03:49:19.527454+00	2026-11-16 03:49:20.068612+00
5WqeCle6c	Admin	#3B8282	153.5281042064972	979.2241333126995	2026-11-16 08:08:00.168665+00	2026-11-16 08:10:38.97854+00
_Xw9MUpyQ	Admin	#3B8282	25	1365	2026-11-16 03:49:20.649535+00	2026-11-16 03:49:29.107503+00
OterQ5AXl	Admin	#3B8282	25	1365	2026-11-16 03:49:29.666372+00	2026-11-16 03:49:30.568615+00
QXf-qduMd	Admin	#3B8282	25	1365	2026-11-16 03:49:31.110081+00	2026-11-16 03:49:31.929301+00
iH532OG-T	Admin	#3B8282	25	1365	2026-11-16 03:49:34.37072+00	2026-11-16 03:49:34.925087+00
vGpFNv8Ky	Admin	#3B8282	25	1365	2026-11-16 03:49:35.487701+00	2026-11-16 03:49:35.957957+00
W83oPIVy9	Admin	#3B8282	25	1365	2026-11-16 03:49:36.496008+00	2026-11-16 03:49:46.689955+00
Tk4R_U42t	HEHE	#3B8282	25	1365	2026-11-16 03:51:03.27497+00	2026-11-16 03:51:04.741693+00
mWZIHvEWX	Admin	#3B8282	25	1365	2026-11-16 07:38:31.80124+00	2026-11-16 07:39:49.745064+00
pvV44pOCY	Dauss	#3B8282	190.46794382900148	1301.2627717378443	2026-11-16 07:39:59.210799+00	2026-11-16 07:40:44.002105+00
wsKsRc-FG	HEHE	#3B8282	25	1365	2026-11-16 06:37:41.328611+00	2026-11-16 06:59:48.930015+00
Kr9_DXJ4u	Dauss	#3B8282	341.8691803918003	1246.8192978820946	2026-11-16 08:48:04.571043+00	2026-11-16 09:21:17.4519+00
zEr9ibCVD	Admin	#3B8282	185.89142322443644	749.1596700468178	2026-11-16 08:10:39.516434+00	2026-11-16 08:14:16.251517+00
rANrnp57f	Dauss	#3B8282	252.72937640376975	708.7561373457519	2026-11-16 08:07:57.097656+00	2026-11-16 08:14:16.353922+00
n2feMgM-i	Admin	#3B8282	183.68524036696326	1499.0775351820196	2026-11-16 08:28:36.417374+00	2026-11-16 08:31:04.404334+00
dF91gdufZ	HEHE	#3B8282	25	1365	2026-11-16 08:14:19.083418+00	2026-11-16 08:14:19.879973+00
BfrLvNP0e	Dauss	#3B8282	25	1365	2026-11-16 08:14:20.520464+00	2026-11-16 08:14:20.891399+00
TXD0i2jws	Admin	#3B8282	135.499177195109	808.3281303148874	2026-11-16 07:47:00.348713+00	2026-11-16 07:50:43.431891+00
6_9g6YVDB	HEHE	#3B8282	25	1365	2026-11-16 08:48:15.314393+00	2026-11-16 09:29:50.120488+00
CHt4M30d7	HEHE	#3B8282	25	1365	2026-11-16 09:29:51.080344+00	2026-11-16 09:29:51.080344+00
39W7QMrD5	Admin	#3B8282	406.06915943093634	1372.4956934068477	2026-11-16 05:55:56.353095+00	2026-11-16 05:56:26.332219+00
i6NmBOe6G	Admin	#3B8282	25	1365	2026-11-16 08:14:21.347838+00	2026-11-16 08:14:22.498921+00
-Oyyd6Tkk	HEHE	#3B8282	25	1365	2026-11-16 08:14:22.251851+00	2026-11-16 08:14:23.537049+00
sxKkBmvFQ	HEHE	#3B8282	25	1365	2026-11-16 04:03:28.739215+00	2026-11-16 04:11:35.875863+00
5b3hcWhsu	Dauss	#3B8282	63.51659845888922	1070.1661420662062	2026-11-16 08:14:23.435643+00	2026-11-16 08:16:42.73296+00
KIc2zHvmm	Dauss	#3B8282	219.70068559682164	1168.9123926894054	2026-11-16 08:16:43.547259+00	2026-11-16 08:19:59.497975+00
qu-7A7Su5	HEHE	#3B8282	25	1365	2026-11-16 08:14:24.250907+00	2026-11-16 08:20:43.559262+00
ZO-6pFnVo	HEHE	#3B8282	25	1365	2026-11-16 08:20:44.355254+00	2026-11-16 08:20:45.395702+00
Gb51V1W45	Admin	#3B8282	1363.6479618052479	847.9536769899049	2026-11-16 09:42:55.874673+00	2026-11-16 09:54:08.567606+00
0gLael6To	Dauss	#3B8282	826.2817342513493	610.0795991858307	2026-11-16 15:24:17.4442+00	2026-11-16 16:07:23.082033+00
O3mptlNZl	Admin	#3B8282	25	1365	2026-11-17 03:05:04.080813+00	2026-11-17 03:05:04.814649+00
hcZri6y6c	HEHE	#3B8282	25	1365	2026-11-16 04:12:34.81433+00	2026-11-16 04:12:35.308585+00
RHIf7AGez	Admin	#3B8282	352.3167170979146	1242.281526778403	2026-11-16 03:30:17.591416+00	2026-11-16 03:31:04.280865+00
-VikXULqe	Admin	#3B8282	25	1365	2026-11-16 06:37:35.95383+00	2026-11-16 06:37:40.436456+00
ed_dr2FFa	Dauss	#3B8282	25	1365	2026-11-16 08:22:14.589537+00	2026-11-16 08:22:16.108891+00
WwjVO16h8	HEHE	#3B8282	25	1365	2026-11-16 07:21:47.28112+00	2026-11-16 07:22:01.33405+00
LJi3ppcR_	Admin	#3B8282	25	1365	2026-11-16 09:36:09.08718+00	2026-11-16 09:36:35.290291+00
00qwGgRMe	HEHE	#3B8282	25	1365	2026-11-16 09:36:37.160227+00	2026-11-16 09:36:50.99799+00
k2CsnqaDS	Admin	#3B8282	25	1365	2026-11-16 09:37:04.486328+00	2026-11-16 09:37:05.67372+00
FsKJmTIi7	Dauss	#3B8282	185.48890827119664	1523.2574029422651	2026-11-16 07:40:44.947031+00	2026-11-16 07:41:43.298491+00
W7QVyUeP5	Admin	#3B8282	25	1365	2026-11-16 09:37:20.39907+00	2026-11-16 09:37:20.547939+00
DfmHCmu6w	Dauss	#3B8282	121.68782003262828	1196.7269093362763	2026-11-16 08:22:39.388169+00	2026-11-16 08:23:45.737099+00
oBpw6Xvln	Dauss	#3B8282	235.88600000000022	1372.4652499999993	2026-11-16 07:22:39.52502+00	2026-11-16 07:26:18.972132+00
_CWcC-hb1	test	#3b82f6	1225	915	2026-11-16 07:28:35.958452+00	2026-11-16 07:28:37.492393+00
JOcqqy3Uw	Dauss	#3B8282	230.5122322121801	1137.1679607500582	2026-11-16 08:23:46.526818+00	2026-11-16 08:24:58.088976+00
um2TKk6dV	Admin	#3B8282	163.50971419035153	1517.577924239691	2026-11-16 07:39:50.325942+00	2026-11-16 07:45:10.426828+00
BpNB-fpL7	Admin	#3B8282	25	1365	2026-11-16 07:45:11.085276+00	2026-11-16 07:45:11.88363+00
l2TJWvUK4	HEHE	#3B8282	25	1365	2026-11-16 07:45:12.589743+00	2026-11-16 07:45:12.763182+00
JkHBbKDUg	Dauss	#3B8282	25	1365	2026-11-16 07:45:13.60584+00	2026-11-16 07:45:14.17206+00
xiiclwwbZ	Admin	#3B8282	25	1365	2026-11-16 07:45:15.18845+00	2026-11-16 07:45:15.509468+00
5f87UIGWA	Dauss	#3B8282	211.28529217199196	1023.2976329531452	2026-11-16 07:54:29.682934+00	2026-11-16 08:05:35.32231+00
2vm3EYtfv	Admin	#3B8282	25	1365	2026-11-16 08:05:59.105992+00	2026-11-16 08:05:59.747376+00
jUrz-hOiV	Admin	#3B8282	412.4534953862193	998.3822260198452	2026-11-16 05:56:26.707689+00	2026-11-16 06:03:36.805298+00
b99FDOKSA	HEHE	#3B8282	25	1365	2026-11-16 08:23:47.359823+00	2026-11-16 08:27:03.549162+00
r1TtANYob	HEHE	#3B8282	25	1365	2026-11-16 08:27:04.465806+00	2026-11-16 08:27:05.522141+00
NpIqcKVtL	Dauss	#3B8282	25	1365	2026-11-16 08:27:05.699542+00	2026-11-16 08:27:24.70192+00
xf77UxJmv	Dauss	#3B8282	25	1365	2026-11-16 08:27:48.503148+00	2026-11-16 08:27:49.427366+00
-2e6saNBo	Admin	#3B8282	25	1365	2026-11-16 08:06:00.329785+00	2026-11-16 08:06:53.433669+00
42_NmxKrI	HEHE	#3B8282	25	1365	2026-11-16 08:06:01.601344+00	2026-11-16 08:06:53.466625+00
zsmKQ8e4b	Admin	#3B8282	25	1365	2026-11-16 08:06:53.930364+00	2026-11-16 08:06:54.378324+00
_AMCiuaIJ	Dauss	#3B8282	25	1365	2026-11-16 08:06:55.695686+00	2026-11-16 08:06:55.703148+00
bWdYDNZCk	Admin	#3B8282	227.71665213145099	1372.4928708132156	2026-11-16 07:34:54.320255+00	2026-11-16 07:38:06.849825+00
ixdTYxH8G	Dauss	#3B8282	379.8219999999998	1365	2026-11-16 07:29:53.801312+00	2026-11-16 07:38:06.988484+00
bMRDCwBqK	Dauss	#3B8282	25	1365	2026-11-16 07:38:08.09632+00	2026-11-16 07:38:08.842124+00
C2PzAwSJQ	Admin	#3B8282	25	1365	2026-11-16 08:06:56.042478+00	2026-11-16 08:06:57.03146+00
xq1MS5hAQ	Admin	#3B8282	302.63175790399964	864.6734329068601	2026-11-16 07:45:17.92546+00	2026-11-16 07:46:58.106748+00
FDOBDn6v2	Admin	#3B8282	25	1365	2026-11-16 07:38:09.536436+00	2026-11-16 07:38:11.057839+00
faoPyRJac	HEHE	#3B8282	25	1365	2026-11-16 07:38:09.944559+00	2026-11-16 07:38:11.490353+00
nlfCzrM8w	Dauss	#3B8282	25	1365	2026-11-16 08:06:56.584946+00	2026-11-16 08:06:57.068078+00
uF6s4a6GP	HEHE	#3B8282	25	1365	2026-11-16 08:06:56.185477+00	2026-11-16 08:06:57.532312+00
PohXctNUF	Admin	#3B8282	737.3753605680442	1021.7452807792235	2026-11-16 03:32:48.83994+00	2026-11-16 03:43:57.188819+00
1rvEHJJj3	Admin	#3B8282	25	1365	2026-11-16 03:47:59.715814+00	2026-11-16 03:48:00.5952+00
wZX9X2UkN	Admin	#3B8282	25	1365	2026-11-16 08:06:57.576577+00	2026-11-16 08:06:58.51472+00
qIxVaUyVX	Dauss	#3B8282	25	1365	2026-11-16 08:06:58.013327+00	2026-11-16 08:06:58.570158+00
7F6eAb_Q-	Admin	#3B8282	25	1365	2026-11-16 07:38:11.56171+00	2026-11-16 07:38:29.176257+00
scTEw7V6B	HEHE	#3B8282	25	1365	2026-11-16 07:38:11.944156+00	2026-11-16 07:38:29.415658+00
GNg2XV34i	Admin	#3B8282	25	1365	2026-11-16 03:48:01.191505+00	2026-11-16 03:48:29.108356+00
r9tCdMrnD	Admin	#3B8282	25	1365	2026-11-16 07:38:29.745101+00	2026-11-16 07:38:31.287892+00
5SByZxfS6	Admin	#3B8282	25	1365	2026-11-16 03:48:29.567641+00	2026-11-16 03:48:36.439213+00
qGa3yiCXo	HEHE	#3B8282	25	1365	2026-11-16 08:06:58.302286+00	2026-11-16 08:06:59.394518+00
0CNEH5gB2	HEHE	#3B8282	25	1365	2026-11-16 03:49:19.856672+00	2026-11-16 03:49:20.724047+00
XEKSkw3H_	HEHE	#3B8282	25	1365	2026-11-16 07:38:32.056737+00	2026-11-16 07:38:32.712104+00
cdlpzB7Uv	HEHE	#3B8282	25	1365	2026-11-16 03:49:21.469639+00	2026-11-16 03:49:29.856098+00
W8pKZ8TnR	HEHE	#3B8282	25	1365	2026-11-16 07:38:35.509447+00	2026-11-16 07:38:35.529085+00
UIbqZcNnM	HEHE	#3B8282	25	1365	2026-11-16 03:49:30.42139+00	2026-11-16 03:49:31.714073+00
IXGzZGg3M	HEHE	#3B8282	25	1365	2026-11-16 03:51:25.765856+00	2026-11-16 03:51:25.765856+00
30CMgi3LZ	Admin	#3B8282	25	1365	2026-11-16 08:06:59.104422+00	2026-11-16 08:06:59.899299+00
0P6aD67T3	HEHE	#3B8282	25	1365	2026-11-16 07:38:38.538013+00	2026-11-16 07:38:39.441978+00
r5HPildzu	Dauss	#3B8282	25	1365	2026-11-16 08:06:59.414798+00	2026-11-16 08:06:59.967887+00
t3xMh-sGE	HEHE	#3B8282	25	1365	2026-11-16 08:07:00.100153+00	2026-11-16 08:07:00.898346+00
bUb49Fb5k	Dauss	#3B8282	179.8351760678722	926.1858224301917	2026-11-16 08:07:00.812377+00	2026-11-16 08:07:20.433435+00
xoo35oWmc	Admin	#3B8282	25	1365	2026-11-16 08:07:00.445558+00	2026-11-16 08:07:20.433436+00
25M4wNTAR	HEHE	#3B8282	25	1365	2026-11-16 08:07:01.817699+00	2026-11-16 08:07:20.433435+00
5EJbPg7BG	Admin	#3B8282	25	1365	2026-11-16 08:14:17.022567+00	2026-11-16 08:14:17.493753+00
vrNtA4wRC	Dauss	#3B8282	25	1365	2026-11-16 08:14:17.93376+00	2026-11-16 08:14:18.20773+00
wWMI-9QnA	Dauss	#3B8282	25	1365	2026-11-16 08:14:18.974504+00	2026-11-16 08:14:19.567646+00
rC-gEXDQ5	Admin	#3B8282	25	1365	2026-11-16 08:14:19.580423+00	2026-11-16 08:14:20.760404+00
bKbabRGTx	HEHE	#3B8282	25	1365	2026-11-16 08:14:20.681652+00	2026-11-16 08:14:21.457944+00
eih_6jZsz	Dauss	#3B8282	25	1365	2026-11-16 08:14:21.827524+00	2026-11-16 08:14:22.555137+00
4LjX_hOYN	Admin	#3B8282	171.80867797589136	1401.386569101364	2026-11-16 08:31:04.869851+00	2026-11-16 08:35:34.070996+00
X49y3tMmR	Dauss	#3B8282	188.34703461404828	646.5228143652222	2026-11-16 07:45:19.403433+00	2026-11-16 07:54:28.258789+00
3GCBvFJVh	Dauss	#3B8282	179.68076962582592	1102.6038705348694	2026-11-16 08:27:50.17962+00	2026-11-16 08:35:34.140053+00
JNEHk-LW-	HEHE	#3B8282	25	1365	2026-11-16 08:27:06.207167+00	2026-11-16 08:35:34.480356+00
jaTdbqtcS	Admin	#3B8282	557.1889724200458	866.5475935337869	2026-11-16 06:37:40.948417+00	2026-11-16 07:04:56.703117+00
n2amHy5X7	Admin	#3B8282	728.1780686272692	984.9655703788368	2026-11-16 04:04:13.066231+00	2026-11-16 04:11:34.718515+00
655W80Ac3	Admin	#3B8282	25	1365	2026-11-16 08:35:34.738859+00	2026-11-16 08:35:45.51552+00
05mJHce3Q	Dauss	#3B8282	25	1365	2026-11-16 08:35:34.803133+00	2026-11-16 08:35:45.599786+00
vpxHM5z_Q	HEHE	#3B8282	25	1365	2026-11-16 08:35:35.208115+00	2026-11-16 08:35:46.447827+00
2FdXf2FFE	Admin	#3B8282	25	1365	2026-11-16 08:35:46.049507+00	2026-11-16 08:35:54.680184+00
Uqbdf7Fpb	Dauss	#3B8282	25	1365	2026-11-16 08:35:46.547019+00	2026-11-16 08:35:54.776024+00
d5UCDB-EH	HEHE	#3B8282	25	1365	2026-11-16 08:35:47.284309+00	2026-11-16 08:35:55.445371+00
lAdyMXuqE	Dauss	#3B8282	25	1365	2026-11-16 08:36:34.74242+00	2026-11-16 08:36:47.336038+00
oqeA1GO11	HEHE	#3B8282	25	1365	2026-11-16 04:12:37.206365+00	2026-11-16 04:37:57.060821+00
9NlTRWkx2	HEHE	#3B8282	25	1365	2026-11-16 04:37:58.915598+00	2026-11-16 04:38:10.667858+00
sIkLqHtdM	Dauss	#3B8282	110.67600144723025	1209.1337864373772	2026-11-16 08:37:02.48457+00	2026-11-16 08:41:46.265091+00
9RuyOBMd3	Dauss	#3B8282	25	1365	2026-11-16 08:41:51.672351+00	2026-11-16 08:41:55.733552+00
PHp3VRP6e	Admin	#3B8282	270.0685058909919	1201.4152264372913	2026-11-16 08:14:23.034733+00	2026-11-16 08:20:43.069905+00
jW3XB2ky8	Admin	#3B8282	25	1365	2026-11-16 10:13:45.276259+00	2026-11-16 10:13:49.680043+00
_aQOdeO8W	Dauss	#3B8282	25	1365	2026-11-16 10:13:45.87921+00	2026-11-16 10:13:49.821504+00
CJlFXFXlu	HEHE	#3B8282	25	1365	2026-11-16 10:13:46.943054+00	2026-11-16 10:13:50.027815+00
4JE61E3wg	HEHE	#3B8282	25	1365	2026-11-16 10:13:55.124194+00	2026-11-16 10:43:04.757531+00
50854C_qQ	HEHE	#3B8282	25	1365	2026-11-16 09:36:09.642112+00	2026-11-16 09:36:35.988083+00
ZWyv5EvYJ	Dauss	#3B8282	25	1365	2026-11-16 16:08:24.670502+00	2026-11-16 16:08:26.180038+00
Z3pm-0hko	HEHE	#3B8282	25	1365	2026-11-17 03:05:04.587408+00	2026-11-17 03:05:05.611096+00
u31BvW33g	Dauss	#3B8282	25	1365	2026-11-16 16:08:27.243162+00	2026-11-16 16:08:28.363093+00
9KA_Xqzt1	Admin	#3B8282	25	1365	2026-11-16 09:36:36.362815+00	2026-11-16 09:36:50.440253+00
dLhtt-R-v	Admin	#3B8282	25	1365	2026-11-17 02:22:53.093754+00	2026-11-17 02:23:24.312778+00
E8pjhwN_a	HEHE	#3B8282	25	1365	2026-11-16 09:37:05.16135+00	2026-11-16 09:37:06.037311+00
v37_RKHz-	Admin	#3B8282	25	1365	2026-11-17 03:05:05.287858+00	2026-11-17 03:05:09.99224+00
IKvyUyAB3	HEHE	#3B8282	25	1365	2026-11-16 09:37:22.56796+00	2026-11-16 09:37:25.975403+00
r9lCsKCJU	Dauss	#3B8282	1214.8621741215127	799.0577347928914	2026-11-16 10:49:28.546421+00	2026-11-16 10:50:00.728099+00
JiQof4KIu	Dauss	#3B8282	25	1365	2026-11-16 09:40:40.246907+00	2026-11-16 09:40:40.886407+00
Sp7D0fBLv	Dauss	#3B8282	25	1365	2026-11-16 16:08:28.833658+00	2026-11-16 16:08:38.296081+00
6iLuvuYCm	Admin	#3B8282	137.65800000000004	1365	2026-11-16 09:54:09.156262+00	2026-11-16 09:54:10.443541+00
PWuj77Fgu	Admin	#3B8282	25	1365	2026-11-16 16:15:43.794468+00	2026-11-16 16:15:43.794468+00
0Bir56jhF	Admin	#3B8282	25	1365	2026-11-17 02:27:30.863805+00	2026-11-17 02:27:31.518567+00
_uFgJIklu	Admin	#3B8282	25	1365	2026-11-17 02:27:31.963463+00	2026-11-17 02:27:37.609424+00
ccjLpAlM4	HEHE	#3B8282	25	1365	2026-11-17 03:06:39.32654+00	2026-11-17 03:06:40.589599+00
2oC5w5tH_	Admin	#3B8282	25	1365	2026-11-16 08:35:55.518444+00	2026-11-16 08:37:24.786476+00
Hu2amyDZD	Admin	#3B8282	25	1365	2026-11-17 03:06:45.682614+00	2026-11-17 03:06:46.811162+00
9pAgJ2u4d	HEHE	#3B8282	25	1365	2026-11-17 03:06:47.053261+00	2026-11-17 03:06:47.592427+00
agOGD6UhE	Admin	#3B8282	523.5876599380972	1220.5346189688742	2026-11-16 10:13:53.192466+00	2026-11-16 10:26:11.559646+00
fgtJu3t2w	Admin	#3B8282	25	1365	2026-11-17 02:27:38.052954+00	2026-11-17 02:28:21.747724+00
qoeurW5rv	Dauss	#3B8282	25	1365	2026-11-17 03:35:12.05559+00	2026-11-17 03:35:37.100304+00
tesMZhaHC	Admin	#3B8282	142.91428033402602	1325.0363196659725	2026-11-16 10:26:18.651353+00	2026-11-16 10:26:26.218522+00
o7LsbzTIi	HEHE	#3B8282	25	1365	2026-11-17 03:06:48.170291+00	2026-11-17 03:07:10.596506+00
-M20QyiHy	HEHE	#3B8282	25	1365	2026-11-17 03:35:12.476404+00	2026-11-17 03:35:37.594428+00
WHqDEQmoJ	HEHE	#3B8282	25	1365	2026-11-17 03:07:11.049304+00	2026-11-17 03:07:11.829541+00
m2iD-Gf1j	Admin	#3B8282	25	1365	2026-11-17 02:28:38.686309+00	2026-11-17 02:29:07.217882+00
h-4m_bLtc	Dauss	#3B8282	608.719059384293	371.7915585824586	2026-11-16 10:27:11.221199+00	2026-11-16 10:27:40.052667+00
h8S8wuuBu	HEHE	#3B8282	25	1365	2026-11-16 08:35:56.18352+00	2026-11-16 08:39:07.464627+00
d_ATT5YOt	Admin	#3B8282	25	1365	2026-11-17 02:29:07.708728+00	2026-11-17 02:29:09.31693+00
cZ71UyinN	Admin	#3B8282	25	1365	2026-11-17 03:07:36.187968+00	2026-11-17 03:07:37.715117+00
iD0lg8hwV	Admin	#3B8282	25	1365	2026-11-17 03:07:38.213658+00	2026-11-17 03:07:38.952402+00
MSwr3dMNo	Dauss	#3B8282	198.74799374052773	1289.0751884575698	2026-11-16 10:57:53.385592+00	2026-11-16 11:00:20.738721+00
8naYF-7NF	Admin	#3B8282	25	1365	2026-11-17 03:08:14.504096+00	2026-11-17 03:08:20.644287+00
rcuOTi8cu	HEHE	#3B8282	25	1365	2026-11-16 08:41:22.453196+00	2026-11-16 08:41:49.905015+00
EhkczQG0C	Dauss	#3B8282	25	1365	2026-11-16 08:41:47.802592+00	2026-11-16 08:41:50.362941+00
SUIltQZED	HEHE	#3B8282	465.73379999999963	1365	2026-11-17 02:31:37.224367+00	2026-11-17 02:32:12.030398+00
APD-b_kOO	HEHE	#3B8282	25	1365	2026-11-17 03:08:47.22366+00	2026-11-17 03:08:52.567058+00
DQRP7BZ8F	HEHE	#3B8282	25	1365	2026-11-17 02:32:12.865035+00	2026-11-17 02:32:13.792592+00
GWCi7JenN	Dauss	#3B8282	885.4885538470853	1272.0111969473603	2026-11-16 11:00:28.186494+00	2026-11-16 11:01:11.236742+00
XF1Dv6K0F	Dauss	#3B8282	25	1365	2026-11-16 13:47:18.122427+00	2026-11-16 13:47:22.006691+00
LSkgW8L0O	Dauss	#3B8282	25	1365	2026-11-16 13:47:24.137343+00	2026-11-16 13:47:25.031548+00
SaBSplbQA	Dauss	#3B8282	25	1365	2026-11-16 13:47:27.549921+00	2026-11-16 13:47:35.73359+00
KbL27-4WZ	Dauss	#3B8282	785.900645309288	1523.3644668893223	2026-11-17 03:12:05.201588+00	2026-11-17 03:14:22.827628+00
RrKrMJhSN	Admin	#3B8282	25	1365	2026-11-17 03:19:10.929059+00	2026-11-17 03:19:13.714231+00
dz9GqCq0h	Admin	#3B8282	25	1365	2026-11-17 03:19:18.152974+00	2026-11-17 03:19:19.131188+00
7hTXymsib	Admin	#3B8282	25	1365	2026-11-17 03:19:20.261727+00	2026-11-17 03:19:21.734001+00
x_LFxA85X	HEHE	#3B8282	25	1365	2026-11-17 03:19:22.147766+00	2026-11-17 03:19:22.93536+00
FaiUKYkxb	HEHE	#3B8282	25	1365	2026-11-16 09:54:11.487903+00	2026-11-16 10:01:41.271769+00
xJLzX9Fp8	HEHE	#3B8282	25	1365	2026-11-17 03:19:23.375972+00	2026-11-17 03:19:34.698573+00
01_ey0Km7	Admin	#3B8282	25	1365	2026-11-17 03:21:14.911767+00	2026-11-17 03:21:16.801139+00
4gL_xdJLC	Admin	#3B8282	25	1365	2026-11-17 03:21:17.419421+00	2026-11-17 03:21:18.69907+00
Z99RlTTH9	HEHE	#3B8282	25	1365	2026-11-17 03:21:18.018394+00	2026-11-17 03:21:19.582885+00
bQpJd4OBX	Admin	#3B8282	25	1365	2026-11-17 03:21:19.237321+00	2026-11-17 03:21:20.405811+00
fLPmvWEir	HEHE	#3B8282	25	1365	2026-11-17 03:21:20.313825+00	2026-11-17 03:21:21.573626+00
upZKebkXL	Admin	#3B8282	25	1365	2026-11-17 03:21:20.869522+00	2026-11-17 03:21:22.031575+00
f-xTkCKF0	Admin	#3B8282	25	1365	2026-11-17 03:21:22.453788+00	2026-11-17 03:21:24.1456+00
DMCZ4fz8y	HEHE	#3B8282	25	1365	2026-11-17 03:21:25.172897+00	2026-11-17 03:21:26.584206+00
SRGauSe62	Admin	#3B8282	25	1365	2026-11-17 03:21:26.456426+00	2026-11-17 03:21:28.450252+00
W7K4bsbGj	HEHE	#3B8282	25	1365	2026-11-17 03:21:27.272909+00	2026-11-17 03:21:28.578794+00
oc0S1Zcr-	Admin	#3B8282	25	1365	2026-11-17 03:21:29.428918+00	2026-11-17 03:21:35.02589+00
8R1GrP-bf	HEHE	#3B8282	25	1365	2026-11-17 03:21:29.563442+00	2026-11-17 03:21:35.025938+00
ICg97Z8AI	Admin	#3B8282	415.3402670585166	1304.3421590984876	2026-11-17 03:23:12.675713+00	2026-11-17 03:28:27.601943+00
dG04OaKpz	Dauss	#3B8282	1080.9824705212964	923.1348020362906	2026-11-17 03:38:41.924537+00	2026-11-17 03:45:58.3908+00
ij1l9VIIU	HEHE	#3B8282	25	1365	2026-11-17 03:35:38.363258+00	2026-11-17 03:45:58.644199+00
mBPwDCVPY	HEHE	#3B8282	25	1365	2026-11-17 03:46:00.26843+00	2026-11-17 03:46:04.593671+00
zgLJv9I-h	Dauss	#3B8282	346.31376017154054	1250.3814197978752	2026-11-17 03:23:28.452243+00	2026-11-17 03:28:47.551504+00
QtBPEqsxf	Dauss	#3B8282	25	1365	2026-11-17 03:46:07.162856+00	2026-11-17 03:46:12.514275+00
txQVKotnt	Dauss	#3B8282	25	1365	2026-11-17 03:51:23.180672+00	2026-11-17 03:51:26.106123+00
7wBPzdKbZ	Dauss	#3B8282	25	1365	2026-11-17 03:51:27.107352+00	2026-11-17 03:51:36.400609+00
PsOIUOXkU	HEHE	#3B8282	25	1365	2026-11-17 03:51:36.128453+00	2026-11-17 03:51:41.616483+00
a2zcNBO5Q	Dauss	#3B8282	473.24559885400345	1029.8946531586323	2026-11-17 03:28:39.530504+00	2026-11-17 03:29:18.340768+00
wAp2RiqGt	Dauss	#3B8282	25	1365	2026-11-17 03:51:37.366484+00	2026-11-17 03:51:42.574721+00
7yTxK73Bp	Dauss	#3B8282	25	1365	2026-11-17 03:51:43.652614+00	2026-11-17 03:51:50.702895+00
n7Rx_P3_s	HEHE	#3B8282	25	1365	2026-11-17 03:51:42.094948+00	2026-11-17 03:51:51.667792+00
UGyY1Os2H	Dauss	#3B8282	1214.7209268492977	917.9151595104415	2026-11-17 03:29:18.416313+00	2026-11-17 03:29:43.000581+00
FiFO_EEwo	HEHE	#3B8282	25	1365	2026-11-17 03:51:52.151824+00	2026-11-17 03:51:56.628508+00
rSC8GPSsA	Dauss	#3B8282	541.0977814731394	1221.501458526853	2026-11-17 03:29:43.050499+00	2026-11-17 03:29:48.756861+00
pcnSLLL2A	Dauss	#3B8282	25	1365	2026-11-17 03:52:09.994101+00	2026-11-17 03:52:41.247702+00
oVLDOWBpD	HEHE	#3B8282	25	1365	2026-11-17 03:52:09.148768+00	2026-11-17 03:52:41.574775+00
PUqqtiUbA	Dauss	#3B8282	139.84407999999993	1365	2026-11-17 03:53:34.475589+00	2026-11-17 03:53:36.584524+00
1dOFavRzm	HEHE	#3B8282	25	1365	2026-11-17 03:55:12.581705+00	2026-11-17 03:55:15.726053+00
l15bhY24u	Dauss	#3B8282	25	1365	2026-11-17 03:55:54.350713+00	2026-11-17 03:55:58.749294+00
f-ykcZxW9	Dauss	#3B8282	25	1365	2026-11-17 04:17:51.992123+00	2026-11-17 04:17:52.982951+00
5ybHN-VTW	Dauss	#3B8282	25	1365	2026-11-16 10:51:32.5057+00	2026-11-16 10:51:32.732071+00
pitFr-hEz	Admin	#3B8282	25	1365	2026-11-16 09:36:51.577196+00	2026-11-16 09:37:03.554813+00
JbRYA0noY	Dauss	#3B8282	25	1365	2026-11-16 08:35:56.404553+00	2026-11-16 08:36:33.462594+00
_q8Eg713D	Admin	#3B8282	25	1365	2026-11-17 02:27:21.711086+00	2026-11-17 02:27:23.265242+00
8ZD-ejrks	HEHE	#3B8282	25	1365	2026-11-17 03:05:06.231642+00	2026-11-17 03:05:09.992288+00
Q8GtoX88D	Dauss	#3B8282	1259.1217959441872	877.7231734801643	2026-11-16 11:00:20.880159+00	2026-11-16 11:00:27.972033+00
6kL34SlXP	Admin	#3B8282	25	1365	2026-11-16 09:37:06.809358+00	2026-11-16 09:37:19.412515+00
wiL0esqtb	Admin	#3B8282	25	1365	2026-11-17 02:28:22.488845+00	2026-11-17 02:28:24.841473+00
lSaeVC5IT	Dauss	#3B8282	25	1365	2026-11-16 16:07:56.861158+00	2026-11-16 16:08:18.91693+00
Ui3DRCYDN	HEHE	#3B8282	25	1365	2026-11-16 09:37:20.128661+00	2026-11-16 09:37:22.030789+00
qg_lTD-WI	Admin	#3B8282	25	1365	2026-11-16 09:37:21.600189+00	2026-11-16 09:37:25.975361+00
H_5wDRlNC	Dauss	#3B8282	25	1365	2026-11-16 16:07:57.438213+00	2026-11-16 16:08:19.888621+00
gub6mHcwr	Admin	#3B8282	148.49896000000007	1365	2026-11-16 09:38:21.703212+00	2026-11-16 09:38:23.967144+00
Pmxa2ZcVH	HEHE	#3B8282	25	1365	2026-11-16 09:40:40.945153+00	2026-11-16 09:40:42.029278+00
KQ-gZBwWL	Dauss	#3B8282	25	1365	2026-11-16 16:08:26.865099+00	2026-11-16 16:08:27.261006+00
-ctOiC-Vv	HEHE	#3B8282	25	1365	2026-11-16 09:40:42.761383+00	2026-11-16 09:40:45.967311+00
J768sx16S	Admin	#3B8282	25	1365	2026-11-17 03:06:41.67496+00	2026-11-17 03:06:42.129886+00
6hJAVOjZp	HEHE	#3B8282	25	1365	2026-11-16 09:40:46.987984+00	2026-11-16 09:40:47.973736+00
eWEHIZD0y	Dauss	#3B8282	25	1365	2026-11-16 16:08:27.927403+00	2026-11-16 16:08:29.338493+00
GcxwGtZsa	Admin	#3B8282	25	1365	2026-11-17 02:28:25.447524+00	2026-11-17 02:28:34.946633+00
QUFpgQYCX	HEHE	#3B8282	25	1365	2026-11-16 09:40:49.129527+00	2026-11-16 09:41:00.96235+00
w4ntIb3jq	Dauss	#3B8282	25	1365	2026-11-16 16:08:29.972442+00	2026-11-16 16:08:38.465131+00
sshYGwbCc	Admin	#3B8282	25	1365	2026-11-17 02:28:35.421358+00	2026-11-17 02:28:37.034729+00
7U7LXi-sb	Admin	#3B8282	25	1365	2026-11-17 03:06:42.842318+00	2026-11-17 03:06:43.735309+00
tZ-ukI5s5	HEHE	#3B8282	25	1365	2026-11-16 08:39:08.342644+00	2026-11-16 08:39:22.572734+00
3NsSdPHwe	HEHE	#3B8282	25	1365	2026-11-16 09:41:02.540023+00	2026-11-16 09:41:06.048394+00
qPdZyB0UJ	Admin	#3B8282	25	1365	2026-11-17 03:06:44.242692+00	2026-11-17 03:06:45.087852+00
zRUjHJGYP	HEHE	#3B8282	25	1365	2026-11-17 03:06:45.408877+00	2026-11-17 03:06:45.990807+00
BSn_Q0kg-	Dauss	#3B8282	1467.8351601780896	534.5183150835328	2026-11-16 13:47:50.792498+00	2026-11-16 13:49:37.430656+00
-bxWstbOL	Dauss	#3B8282	403.50581459161253	1314.5716337260121	2026-11-16 09:41:05.601547+00	2026-11-16 09:41:57.701344+00
kLm-Fy_rL	Dauss	#3B8282	25	1365	2026-11-16 15:24:18.140682+00	2026-11-16 15:24:18.235539+00
noheMqU_3	Dauss	#3B8282	156.53594899348408	1260.4181979938337	2026-11-16 08:44:58.659068+00	2026-11-16 08:47:57.536796+00
B3Hs6812N	Dauss	#3B8282	405.3919136250049	1300.917846374995	2026-11-17 02:30:30.523116+00	2026-11-17 02:31:23.952916+00
gx-yXhd4a	Admin	#3B8282	25	1365	2026-11-17 03:06:47.334191+00	2026-11-17 03:07:09.932708+00
8LeiI5w-g	Dauss	#3B8282	1225	915	2026-11-17 02:32:08.667816+00	2026-11-17 02:32:11.76648+00
8JyhraZZT	Dauss	#3B8282	25	1365	2026-11-17 02:32:12.365638+00	2026-11-17 02:32:13.047322+00
-JUjSSf0o	Admin	#3B8282	25	1365	2026-11-17 03:07:10.323307+00	2026-11-17 03:07:11.229651+00
ocl9F5MKY	Admin	#3B8282	25	1365	2026-11-16 08:37:25.300778+00	2026-11-16 08:41:46.226229+00
QiYxQJ7af	Admin	#3B8282	539.0578918147194	682.2047081852792	2026-11-16 16:13:45.852556+00	2026-11-16 16:15:43.435931+00
uRPccZUCS	Admin	#3B8282	25	1365	2026-11-16 08:41:47.298457+00	2026-11-16 08:41:48.370833+00
HcFhlXKEJ	Dauss	#3B8282	115.38466666666669	1365	2026-11-16 16:43:26.454121+00	2026-11-16 16:43:33.571109+00
hwlEXGiaB	Admin	#3B8282	25	1365	2026-11-16 08:41:49.10405+00	2026-11-16 08:41:55.664139+00
SE1OlRbAV	Admin	#3B8282	25	1365	2026-11-17 03:07:11.510039+00	2026-11-17 03:07:35.607499+00
Qk6-4r_Bm	HEHE	#3B8282	25	1365	2026-11-17 03:07:12.264927+00	2026-11-17 03:07:36.555815+00
ZLCuNKSFB	HEHE	#3B8282	25	1365	2026-11-17 03:07:37.182155+00	2026-11-17 03:07:38.566822+00
yBXv1GU7s	HEHE	#3B8282	25	1365	2026-11-17 03:08:15.875061+00	2026-11-17 03:08:20.644342+00
EQDKSSJXF	Dauss	#3B8282	25	1365	2026-11-16 08:41:57.405395+00	2026-11-16 08:42:23.070504+00
VgUfq2aJd	Dauss	#3B8282	220.95352371349037	1327.1176362865085	2026-11-17 02:32:13.660856+00	2026-11-17 02:34:26.894822+00
2t2prLjnb	Dauss	#3B8282	224.88675989300756	1209.376390733289	2026-11-16 08:42:30.304894+00	2026-11-16 08:42:52.419876+00
eZFMm9EWO	Dauss	#3B8282	25	1365	2026-11-16 08:44:24.853955+00	2026-11-16 08:44:24.853955+00
CjBiRXmmQ	Dauss	#3B8282	25	1365	2026-11-16 08:44:27.630543+00	2026-11-16 08:44:31.637542+00
mFzHVU7L6	Dauss	#3B8282	25	1365	2026-11-16 08:44:39.988206+00	2026-11-16 08:44:46.265478+00
fnP12z27_	HEHE	#3B8282	25	1365	2026-11-16 09:41:07.462594+00	2026-11-16 09:54:08.937049+00
nlShLADrK	HEHE	#3B8282	25	1365	2026-11-16 09:54:09.819742+00	2026-11-16 09:54:10.937939+00
q6mUujF4u	Admin	#3B8282	25	1365	2026-11-16 08:41:56.543673+00	2026-11-16 08:45:30.862115+00
8mqXd29g-	Dauss	#3B8282	181.01091999999994	1365	2026-11-16 15:59:48.89125+00	2026-11-16 16:07:23.081151+00
VpLoP5NuS	Dauss	#3B8282	25	1365	2026-11-16 16:07:23.650458+00	2026-11-16 16:07:29.735762+00
1mnw1rkxY	Dauss	#3B8282	25	1365	2026-11-16 16:07:24.062971+00	2026-11-16 16:07:29.735769+00
GKVUEepa9	Dauss	#3B8282	25	1365	2026-11-16 16:07:52.208523+00	2026-11-16 16:07:53.046935+00
EVNo423Lr	Dauss	#3B8282	25	1365	2026-11-16 16:07:52.923091+00	2026-11-16 16:07:53.395546+00
PgO2Zuoi_	Admin	#3B8282	562.9673532467707	629.4172407837004	2026-11-16 10:03:50.256761+00	2026-11-16 10:13:44.311881+00
pUbEP5qLL	HEHE	#3B8282	25	1365	2026-11-16 10:01:41.927975+00	2026-11-16 10:13:45.629324+00
Sm2-BXFfI	Dauss	#3B8282	25	1365	2026-11-16 16:07:53.586844+00	2026-11-16 16:07:54.721963+00
rQN9LnbZ9	Admin	#3B8282	25	1365	2026-11-16 10:13:50.252088+00	2026-11-16 10:13:50.705782+00
foV-sd9rl	HEHE	#3B8282	25	1365	2026-11-16 10:13:50.976994+00	2026-11-16 10:13:51.08436+00
iY_1UXdkU	Dauss	#3B8282	25	1365	2026-11-16 16:07:54.23183+00	2026-11-16 16:07:55.625752+00
0NwW-K2oP	Admin	#3B8282	25	1365	2026-11-16 10:13:51.319887+00	2026-11-16 10:13:52.458237+00
718GOITnZ	HEHE	#3B8282	25	1365	2026-11-16 10:13:52.844278+00	2026-11-16 10:13:53.211449+00
wxuzdkfQ7	Dauss	#3B8282	25	1365	2026-11-16 16:07:55.111642+00	2026-11-16 16:07:56.421155+00
CG2bsPRr3	Dauss	#3B8282	25	1365	2026-11-16 16:07:56.317459+00	2026-11-16 16:07:56.690747+00
Uo45Ty_Zw	Dauss	#3B8282	25	1365	2026-11-16 10:13:54.0495+00	2026-11-16 10:13:59.472421+00
rmTP5BdgZ	Admin	#3B8282	866.5641210750091	1359.493859215854	2026-11-17 03:09:55.586319+00	2026-11-17 03:17:55.183745+00
j7QpNNbPq	Admin	#3B8282	25	1365	2026-11-17 03:17:55.945914+00	2026-11-17 03:18:01.886532+00
kvMZFmhm2	Dauss	#3B8282	137.60600000000005	1365	2026-11-17 03:17:58.04747+00	2026-11-17 03:18:01.88661+00
h2krEvBke	HEHE	#3B8282	25	1365	2026-11-17 03:19:11.447213+00	2026-11-17 03:19:12.040526+00
sKEpvw02t	HEHE	#3B8282	25	1365	2026-11-17 03:19:14.201342+00	2026-11-17 03:19:15.60562+00
h8lwlj8nN	Admin	#3B8282	25	1365	2026-11-17 03:19:17.008755+00	2026-11-17 03:19:17.069649+00
FfiIQPeip	HEHE	#3B8282	25	1365	2026-11-17 03:19:17.815331+00	2026-11-17 03:19:18.782897+00
r9j35RYhq	HEHE	#3B8282	25	1365	2026-11-17 03:19:19.417354+00	2026-11-17 03:19:20.063723+00
hRthTCY0a	Dauss	#3B8282	222.24206179775436	1345.1733786051577	2026-11-16 10:26:35.853127+00	2026-11-16 10:27:11.133656+00
uH526henz	HEHE	#3B8282	25	1365	2026-11-17 03:19:20.565941+00	2026-11-17 03:19:21.540088+00
s1jSrCY56	Admin	#3B8282	25	1365	2026-11-17 03:19:22.141147+00	2026-11-17 03:19:22.241986+00
FQx27T8mP	Admin	#3B8282	1763.2189889075173	371.7625726711872	2026-11-17 01:19:33.568344+00	2026-11-17 01:30:37.953426+00
XAaQiL6Xr	Admin	#3B8282	25	1365	2026-11-17 03:19:22.960732+00	2026-11-17 03:19:34.698488+00
H2xjAzMUW	Admin	#3B8282	890.318448027406	1340.3106149170553	2026-11-16 09:54:11.060779+00	2026-11-16 10:03:49.752799+00
Gblr6wI3u	Admin	#3B8282	1070.1989227869603	380.02405156120045	2026-11-16 08:45:31.824005+00	2026-11-16 09:29:49.594854+00
frCNbV1k5	Dauss	#3B8282	724.3464533130904	1359.976368811702	2026-11-17 02:34:50.946788+00	2026-11-17 02:55:08.915513+00
Cvb94nIho	Dauss	#3B8282	179.41294253888452	1259.8420009489532	2026-11-16 10:27:40.11004+00	2026-11-16 10:30:41.420605+00
BpCNWJCct	HEHE	#3B8282	25	1365	2026-11-17 04:17:52.377868+00	2026-11-17 04:17:53.631639+00
QMd-C8kYf	Admin	#3B8282	1050.847967976255	1057.9604809426223	2026-11-21 07:04:20.129243+00	2026-11-21 07:04:25.611243+00
qYSsQNFlQ	HEHE	#3B8282	25	1365	2026-11-17 04:17:54.536128+00	2026-11-17 04:17:55.62839+00
sY0eBV8fX	Dauss	#3B8282	25	1365	2026-11-17 04:57:58.600424+00	2026-11-17 04:58:10.811235+00
pw7zXmYw_	Dauss	#3B8282	25	1365	2026-11-17 04:17:55.228758+00	2026-11-17 04:17:56.360658+00
t7l7zoysb	HEHE	#3B8282	25	1365	2026-11-17 04:17:56.334734+00	2026-11-17 04:17:57.077936+00
nnY_XGryy	HEHE	#3B8282	25	1365	2026-11-17 04:17:57.859471+00	2026-11-17 04:18:10.290513+00
taOwW_NFe	Dauss	#3B8282	25	1365	2026-11-17 04:17:56.97561+00	2026-11-17 04:18:10.290463+00
ov14o8VmT	Dauss	#3B8282	1070.6157471858933	859.7537471858952	2026-11-17 05:00:10.933355+00	2026-11-17 05:00:38.403738+00
2ce1Q4B41	Dauss	#3B8282	471.2078253333782	434.87440251440574	2026-11-17 03:35:37.890776+00	2026-11-17 03:38:41.839121+00
LSacNrLpZ	Admin	#3B8282	1863.5049597641255	462.05380411906776	2026-11-17 01:30:38.449312+00	2026-11-17 02:22:52.332358+00
HPtjGCMlj	Admin	#3B8282	25	1365	2026-11-17 02:27:23.779183+00	2026-11-17 02:27:28.352214+00
Q2LFbRzfL	Admin	#3B8282	25	1365	2026-11-17 02:27:28.823176+00	2026-11-17 02:27:30.433822+00
C3tAWWSGs	Admin	#3B8282	25	1365	2026-11-17 02:28:37.519002+00	2026-11-17 02:28:38.12174+00
4rhOR9YS7	Dauss	#3B8282	1225	915	2026-11-17 02:31:24.02665+00	2026-11-17 02:31:30.611694+00
HEcSi8_wi	Dauss	#3B8282	196.09830947578115	1280.1805126244665	2026-11-17 02:31:30.674401+00	2026-11-17 02:32:08.588249+00
n1wt5sgWh	Dauss	#3B8282	756.8624264228746	1341.035557960305	2026-11-17 05:00:38.483195+00	2026-11-17 05:05:36.765442+00
dIu1uUxBP	Dauss	#3B8282	25	1365	2026-11-17 05:07:22.109646+00	2026-11-17 05:07:22.786899+00
x6OxYg0ng	Dauss	#3B8282	1138.252498012936	782.0133476393022	2026-11-17 02:34:26.969109+00	2026-11-17 02:34:50.8902+00
AnApYuD2t	Dauss	#3B8282	25	1365	2026-11-17 05:08:19.144603+00	2026-11-17 05:08:21.699227+00
RDRPlmcH3	Dauss	#3B8282	25	1365	2026-11-17 05:09:51.713185+00	2026-11-17 05:11:32.275305+00
WkE_8Uzol	Dauss	#3B8282	25	1365	2026-11-17 05:11:32.66763+00	2026-11-17 05:11:40.289553+00
5Q58U7YhL	Dauss	#3B8282	25	1365	2026-11-17 05:11:33.472714+00	2026-11-17 05:11:40.359166+00
Y8rq2fc5T	Dauss	#3B8282	251.64093271723533	1272.1334076267449	2026-11-17 03:36:58.90198+00	2026-11-17 03:45:58.563842+00
SWRR69AMl	Dauss	#3B8282	25	1365	2026-11-17 05:11:41.256814+00	2026-11-17 05:11:42.210934+00
22H7CwuW1	HEHE	#3B8282	25	1365	2026-11-17 03:50:49.846102+00	2026-11-17 03:50:55.731332+00
ENn3QbMMF	Dauss	#3B8282	25	1365	2026-11-17 05:11:42.66629+00	2026-11-17 05:11:43.957336+00
-YRiPJQcf	Dauss	#3B8282	25	1365	2026-11-17 05:11:43.17755+00	2026-11-17 05:11:44.0412+00
pV2aTs155	HEHE	#3B8282	25	1365	2026-11-17 03:50:56.117278+00	2026-11-17 03:51:22.583157+00
6hifCb9rt	HEHE	#3B8282	25	1365	2026-11-17 03:51:23.236144+00	2026-11-17 03:51:26.600286+00
5KLzDpC9i	HEHE	#3B8282	25	1365	2026-11-17 03:51:27.075426+00	2026-11-17 03:51:35.577779+00
-4Or2f2Nh	Dauss	#3B8282	25	1365	2026-11-17 03:51:51.825449+00	2026-11-17 03:51:56.808713+00
854SO-bLF	HEHE	#3B8282	25	1365	2026-11-17 03:52:42.092737+00	2026-11-17 03:52:47.845862+00
9JWo2zQfO	Dauss	#3B8282	1075.5400399999987	915	2026-11-17 03:53:36.730708+00	2026-11-17 03:54:57.809951+00
DY_Ts8uy0	Admin	#3B8282	343.53120000002275	1365	2026-11-17 02:55:18.759266+00	2026-11-17 03:05:03.353206+00
k2p3jCPzn	HEHE	#3B8282	25	1365	2026-11-17 02:32:14.589822+00	2026-11-17 03:05:03.617244+00
HdiIrn4LX	Dauss	#3B8282	25	1365	2026-11-17 03:55:31.829712+00	2026-11-17 03:55:37.841114+00
xiJmOB-f0	Admin	#3B8282	25	1365	2026-11-17 03:06:38.405821+00	2026-11-17 03:06:39.81991+00
EjGpRwJJ1	Dauss	#3B8282	1084.2416310842475	850.0368310842497	2026-11-17 04:20:08.628877+00	2026-11-17 04:30:55.149746+00
bJS6bU7Lr	Admin	#3B8282	25	1365	2026-11-17 03:06:40.318342+00	2026-11-17 03:06:40.985757+00
L4vK68tcY	HEHE	#3B8282	25	1365	2026-11-17 03:06:41.253918+00	2026-11-17 03:06:42.157049+00
OdUb5-iQN	HEHE	#3B8282	25	1365	2026-11-17 03:55:55.10071+00	2026-11-17 03:55:59.600996+00
20fzdUIrc	HEHE	#3B8282	25	1365	2026-11-17 03:06:43.372621+00	2026-11-17 03:06:44.529382+00
q1tld2O39	HEHE	#3B8282	25	1365	2026-11-17 04:30:49.384982+00	2026-11-17 04:30:55.756993+00
07ZpJHY_H	HEHE	#3B8282	25	1365	2026-11-17 03:07:39.324421+00	2026-11-17 03:07:39.932148+00
yNAK6_aDB	Admin	#3B8282	25	1365	2026-11-17 03:08:46.625434+00	2026-11-17 03:08:52.567059+00
c0P_-f9QT	Dauss	#3B8282	25	1365	2026-11-17 04:30:56.186145+00	2026-11-17 04:31:00.313827+00
jqNl6CQ0l	Dauss	#3B8282	25	1365	2026-11-17 03:55:59.301015+00	2026-11-17 03:56:06.431325+00
_1c3GbMfD	HEHE	#3B8282	25	1365	2026-11-17 03:56:00.169237+00	2026-11-17 03:56:06.431367+00
zchl5MTD2	Dauss	#3B8282	25	1354.7299999999998	2026-11-17 05:11:44.986325+00	2026-11-17 05:14:00.257127+00
mab3UVWRL	Dauss	#3B8282	25	1365	2026-11-17 04:31:01.075326+00	2026-11-17 04:31:07.052707+00
yi3aDEjfk	Dauss	#3B8282	25	1365	2026-11-17 04:32:54.422821+00	2026-11-17 04:32:55.535341+00
n2YAOt1xI	HEHE	#3B8282	25	1365	2026-11-17 04:32:56.992843+00	2026-11-17 04:33:10.587594+00
x9TeJx7DE	Dauss	#3B8282	25	1365	2026-11-17 04:33:10.352723+00	2026-11-17 04:33:11.718652+00
echlrKCjb	HEHE	#3B8282	25	1365	2026-11-17 04:33:11.214006+00	2026-11-17 04:33:12.622478+00
IoXoBVH_j	Dauss	#3B8282	25	1365	2026-11-17 04:33:12.201504+00	2026-11-17 04:33:13.086897+00
R8JS1ILBH	Dauss	#3B8282	25	1365	2026-11-17 04:33:13.618541+00	2026-11-17 04:33:14.308048+00
4JUuPq1z5	HEHE	#3B8282	25	1365	2026-11-17 04:33:14.744727+00	2026-11-17 04:33:15.628954+00
IHlSBf4Dn	HEHE	#3B8282	25	1365	2026-11-17 04:33:17.531435+00	2026-11-17 04:33:18.611174+00
3r89kCrcD	Dauss	#3B8282	25	1365	2026-11-17 04:33:19.803173+00	2026-11-17 04:33:20.305549+00
HcNGm80YG	HEHE	#3B8282	25	1365	2026-11-17 04:33:21.240702+00	2026-11-17 04:33:38.640295+00
ZBZEjCu9y	HEHE	#3B8282	25	1365	2026-11-17 04:33:39.295644+00	2026-11-17 04:33:40.152247+00
ngoQPooft	Dauss	#3B8282	25	1365	2026-11-17 04:33:39.713619+00	2026-11-17 04:33:40.602527+00
kDk5UUEKb	HEHE	#3B8282	25	1365	2026-11-17 04:33:40.881751+00	2026-11-17 04:33:41.771727+00
omVGtTlw8	Dauss	#3B8282	25	1365	2026-11-17 04:34:15.728322+00	2026-11-17 04:34:40.658878+00
ZQNATmfC1	HEHE	#3B8282	795.630014933551	1341.6192069414492	2026-11-17 03:10:54.599353+00	2026-11-17 03:17:55.706491+00
LMEwRjfcA	HEHE	#3B8282	25	1365	2026-11-17 03:17:57.448592+00	2026-11-17 03:18:01.886569+00
7RyYhlT2y	HEHE	#3B8282	25	1365	2026-11-17 03:19:13.191929+00	2026-11-17 03:19:13.581894+00
x_C-Y7GYW	HEHE	#3B8282	25	1365	2026-11-17 04:38:23.829343+00	2026-11-17 04:38:35.820582+00
AHW07wqLk	Admin	#3B8282	25	1365	2026-11-17 03:19:14.901209+00	2026-11-17 03:19:15.825279+00
SSmrv99RH	HEHE	#3B8282	25	1365	2026-11-17 03:19:16.319215+00	2026-11-17 03:19:17.010424+00
Sl1K0sr7o	HEHE	#3B8282	25	1365	2026-11-17 03:21:15.425226+00	2026-11-17 03:21:17.551419+00
GVhu5Ic-I	HEHE	#3B8282	25	1365	2026-11-17 03:21:22.422015+00	2026-11-17 03:21:22.895744+00
r5UC5k1Bx	HEHE	#3B8282	25	1365	2026-11-17 03:21:24.158975+00	2026-11-17 03:21:24.619445+00
OXe5T9Tsy	Admin	#3B8282	25	1365	2026-11-17 03:21:24.786839+00	2026-11-17 03:21:26.110041+00
Lgr-NMv7W	Dauss	#3B8282	409.43578022803086	1162.5850197719694	2026-11-17 04:35:50.922883+00	2026-11-17 04:41:17.719283+00
-JEznlyHm	Dauss	#3B8282	25	1365	2026-11-17 04:41:19.294085+00	2026-11-17 04:41:19.767813+00
vMvC-sQDN	Dauss	#3B8282	25	1365	2026-11-17 04:41:22.079582+00	2026-11-17 04:41:23.362524+00
eL-7kZI1w	Dauss	#3B8282	1075.771574476221	909.0236797439862	2026-11-17 03:56:59.245847+00	2026-11-17 04:07:40.554255+00
DGzZs60bW	Dauss	#3B8282	25	1365	2026-11-17 04:41:24.409094+00	2026-11-17 04:41:31.692742+00
fw2-cagv3	HEHE	#3B8282	25	1365	2026-11-17 04:07:42.543531+00	2026-11-17 04:07:43.586307+00
Ch7XjTI4a	Dauss	#3B8282	25	1365	2026-11-17 04:07:42.974971+00	2026-11-17 04:07:44.678878+00
-6Mg6iHU5	HEHE	#3B8282	25	1365	2026-11-17 03:25:30.366149+00	2026-11-17 03:26:05.764095+00
iI2lZn9gb	HEHE	#3B8282	25	1365	2026-11-17 04:07:48.017283+00	2026-11-17 04:07:49.615209+00
dQyV9urVf	Dauss	#3B8282	924.1954399999993	1365	2026-11-17 04:07:49.890339+00	2026-11-17 04:07:55.830081+00
y9jWbKTyr	Dauss	#3B8282	423.67932	1365	2026-11-17 04:09:39.220714+00	2026-11-17 04:09:42.304951+00
izGdjWJCl	HEHE	#3B8282	739.2977840435638	1211.7541960046453	2026-11-17 03:26:08.071152+00	2026-11-17 03:26:40.274121+00
5fUXdKan3	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:02:43.439066+00	2026-11-17 07:02:47.02858+00
fz4Ix0la-	Dauss	#3B8282	25	1365	2026-11-17 04:17:53.665966+00	2026-11-17 04:17:54.697788+00
nUpBhQ5k1	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:02:45.852059+00	2026-11-17 07:02:47.160859+00
nnP49JMpI	Dauss	#3B8282	482.0940399999993	1365	2026-11-17 04:20:05.419744+00	2026-11-17 04:20:08.567941+00
YYIV6g96F	Dauss	#3B8282	1168.5353106408268	870.5034665280726	2026-11-20 02:29:04.494688+00	2026-11-20 02:29:13.727761+00
6qx_lpf78	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:02:55.959587+00	2026-11-17 07:02:57.358928+00
u-uDtwqSG	HEHE	#3B8282	25	1365	2026-11-17 07:03:00.49871+00	2026-11-17 07:03:12.835942+00
fiz-UvR8S	Dauss	#3B8282	1075.4968799999967	915	2026-11-17 03:29:48.834433+00	2026-11-17 03:35:11.205105+00
5Jo5674GH	HEHE	#3B8282	717.762489920609	946.5672946115302	2026-11-17 03:26:40.692402+00	2026-11-17 03:35:11.624309+00
M7b1aef5-	HEHE	#3B8282	25	1365	2026-11-17 06:32:07.784674+00	2026-11-17 06:36:08.049827+00
O61m_ztSE	HEHE	#3B8282	25	1365	2026-11-17 04:25:49.646363+00	2026-11-17 04:30:48.749128+00
zZs30iCRL	HEHE	#3B8282	25	1365	2026-11-17 04:30:56.505727+00	2026-11-17 04:31:00.623193+00
IQUwlCwrq	HEHE	#3B8282	25	1365	2026-11-17 04:31:01.275362+00	2026-11-17 04:31:07.052754+00
ztsY2Mj4l	HEHE	#3B8282	25	1365	2026-11-17 04:32:55.118229+00	2026-11-17 04:32:56.624726+00
iFGeY7zKz	Dauss	#3B8282	25	1365	2026-11-17 04:32:56.003288+00	2026-11-17 04:33:09.896805+00
79RCSnTfy	HEHE	#3B8282	25	1365	2026-11-17 04:33:13.301388+00	2026-11-17 04:33:13.924572+00
4KfTTXUtL	Dauss	#3B8282	25	1365	2026-11-17 04:33:14.930815+00	2026-11-17 04:33:15.940275+00
mEByDASls	Dauss	#3B8282	25	1365	2026-11-17 04:33:16.793086+00	2026-11-17 04:33:19.196625+00
21yaPyIs5	HEHE	#3B8282	25	1365	2026-11-17 04:33:19.18711+00	2026-11-17 04:33:20.592988+00
uPhTKc8N7	Dauss	#3B8282	25	1365	2026-11-17 04:33:20.77536+00	2026-11-17 04:33:37.838905+00
IBXcNRz_I	Dauss	#3B8282	25	1365	2026-11-17 04:33:38.283273+00	2026-11-17 04:33:38.985805+00
KZ2q6XATI	HEHE	#3B8282	25	1365	2026-11-17 04:34:16.705711+00	2026-11-17 04:34:40.658925+00
GAb1wh1d4	HEHE	#3B8282	25	1365	2026-11-17 06:40:09.593587+00	2026-11-17 06:44:10.024512+00
yAR1kbSMb	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:47:44.694611+00	2026-11-17 06:47:50.639762+00
F2yIl2Mfn	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:47:48.561035+00	2026-11-17 06:47:50.639801+00
E9_EewkB8	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:49:23.044483+00	2026-11-17 06:49:24.168242+00
OG9MVUQE1	Dauss	#3B8282	25	1365	2026-11-17 03:46:01.347389+00	2026-11-17 03:46:03.86958+00
ztjquzUUK	Dauss	#3B8282	25	1365	2026-11-17 03:45:59.653923+00	2026-11-17 03:46:05.646465+00
IR4_SxlFO	HEHE	#3B8282	25	1365	2026-11-17 03:46:05.146851+00	2026-11-17 03:46:17.448667+00
hG3-uIx0O	Dauss	#3B8282	25	1365	2026-11-17 03:46:06.831158+00	2026-11-17 03:46:17.448667+00
HVV8ktjyS	Dauss	#3B8282	25	1365	2026-11-17 04:57:57.600111+00	2026-11-17 05:07:12.424405+00
qe3p1uqt3	Dauss	#3B8282	25	1365	2026-11-17 03:50:50.492217+00	2026-11-17 03:50:56.552902+00
4_P-7Fzps	Dauss	#3B8282	25	1365	2026-11-17 05:07:13.159444+00	2026-11-17 05:07:13.545954+00
3skjt1pX_	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:49:24.602307+00	2026-11-17 06:50:14.007247+00
z2ovkjUw2	Dauss	#3B8282	25	1365	2026-11-17 05:07:33.624502+00	2026-11-17 05:07:35.129105+00
NmhY-iTJ9	Dauss	#3B8282	25	1365	2026-11-17 05:07:35.618937+00	2026-11-17 05:07:36.249972+00
rWtm1DOZW	Dauss	#3B8282	25	1365	2026-11-17 03:50:57.752202+00	2026-11-17 03:51:21.785254+00
r1dUJDHna	Dauss	#3B8282	25	1365	2026-11-17 05:07:36.913351+00	2026-11-17 05:07:38.35063+00
6W6CZ3FIJ	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:50:14.635215+00	2026-11-17 06:50:16.15677+00
XTUwdLCVL	Dauss	#3B8282	25	1365	2026-11-17 05:08:22.20001+00	2026-11-17 05:08:22.802824+00
_bFp-7PaC	HEHE	#3B8282	25	1365	2026-11-17 03:51:57.26552+00	2026-11-17 03:52:08.606651+00
gQ76THVJs	Dauss	#3B8282	25	1365	2026-11-17 03:51:57.828602+00	2026-11-17 03:52:09.030526+00
vD1oriwJY	HEHE	#3B8282	25	1365	2026-11-17 06:50:15.621984+00	2026-11-17 06:50:16.902566+00
bBinTHaCy	Dauss	#3B8282	25	1365	2026-11-17 03:52:42.226834+00	2026-11-17 03:52:47.845907+00
At1ZubfQd	Dauss	#3B8282	25	1365	2026-11-17 03:55:11.337111+00	2026-11-17 03:55:15.335056+00
hNUuDGjHR	HEHE	#3B8282	25	1365	2026-11-17 06:50:17.511484+00	2026-11-17 06:50:18.97591+00
pMmk3tOtd	HEHE	#3B8282	25	1365	2026-11-17 03:55:32.867304+00	2026-11-17 03:55:37.841155+00
dR-uah_XY	HEHE	#3B8282	25	1365	2026-11-17 05:09:58.577157+00	2026-11-17 05:10:15.38506+00
OOrJV6wZr	Dauss	#3B8282	247.90361154669972	1237.4706284533006	2026-11-17 03:56:56.665307+00	2026-11-17 03:56:59.184939+00
g7lndSRD_	Dauss	#3B8282	25	1365	2026-11-17 04:07:41.251403+00	2026-11-17 04:07:42.558083+00
_d910oHZf	Dauss	#3B8282	25	1365	2026-11-17 05:11:41.009559+00	2026-11-17 05:11:42.17021+00
YuGK6Lfhk	HEHE	#3B8282	25	1365	2026-11-17 04:07:44.03129+00	2026-11-17 04:07:45.940818+00
7Aa_ZHxB5	Dauss	#3B8282	25	1365	2026-11-17 04:07:45.025346+00	2026-11-17 04:07:46.687065+00
MrmRnWnzS	HEHE	#3B8282	25	1365	2026-11-17 06:50:21.040847+00	2026-11-17 06:50:39.976254+00
7fY3rNvfD	HEHE	#3B8282	25	1365	2026-11-17 04:07:46.305897+00	2026-11-17 04:07:47.576117+00
Zcp1O2zZa	Dauss	#3B8282	95.30712000000003	1365	2026-11-17 04:07:47.107424+00	2026-11-17 04:07:49.284776+00
ezJI8rn9W	HEHE	#3B8282	25	1365	2026-11-17 04:07:50.276256+00	2026-11-17 04:07:55.830126+00
Zb0We2Fq3	Dauss	#3B8282	25	1365	2026-11-17 05:19:08.934732+00	2026-11-17 05:19:56.540006+00
Jc1w03A3C	Dauss	#3B8282	25	1356.2640000000001	2026-11-17 04:36:28.123474+00	2026-11-17 04:41:17.880628+00
qaww9-73j	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:50:40.185172+00	2026-11-17 06:51:07.137835+00
3dr9nCye4	Dauss	#3B8282	25	1365	2026-11-17 04:41:18.545994+00	2026-11-17 04:41:19.621463+00
qWlyRfmDe	Dauss	#3B8282	25	1365	2026-11-17 05:19:59.235471+00	2026-11-17 05:20:17.764362+00
2t1qKDA8j	Dauss	#3B8282	25	1365	2026-11-17 04:41:20.313894+00	2026-11-17 04:41:21.189129+00
jml-uc7VM	Dauss	#3B8282	25	1365	2026-11-17 04:41:20.697767+00	2026-11-17 04:41:21.260477+00
pM4Bpdp1Z	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:51:07.712726+00	2026-11-17 06:51:09.093807+00
_k7WhUyL1	Dauss	#3B8282	25	1365	2026-11-17 04:41:22.255333+00	2026-11-17 04:41:23.429578+00
UwQf3eFqP	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:51:11.466017+00	2026-11-17 06:51:13.224331+00
-R6D_Vj04	HEHE	#3B8282	25	1365	2026-11-17 06:51:14.69965+00	2026-11-17 06:51:27.048598+00
ZpgiY-r8i	Dauss	#3B8282	526.6404692541684	1026.0488223445038	2026-11-17 04:42:27.31131+00	2026-11-17 04:43:04.112858+00
cOhl7v-43	Dauss	#3B8282	316.47255068606694	1294.530049313933	2026-11-17 04:41:24.135301+00	2026-11-17 04:43:11.171502+00
Nl9y9_sdh	HEHE	#3B8282	25	1365	2026-11-17 06:55:15.742528+00	2026-11-17 06:59:16.038318+00
pmDY4r0aI	Dauss	#3B8282	1081.9745199999966	915	2026-11-17 04:09:42.369116+00	2026-11-17 04:15:53.728988+00
6v0X798RE	HEHE	#3B8282	25	1365	2026-11-17 04:12:49.262107+00	2026-11-17 04:15:54.734793+00
7MvZIMxvx	Dauss	#3B8282	25	1365	2026-11-17 04:15:54.333003+00	2026-11-17 04:15:55.459815+00
YojTVSTj5	Dauss	#3B8282	1085.7501454786623	837.3432713239886	2026-11-17 04:43:04.212935+00	2026-11-17 04:45:53.999517+00
wIHWcOK3m	HEHE	#3B8282	25	1365	2026-11-17 04:15:56.700648+00	2026-11-17 04:16:02.146922+00
3wNTLRkKD	Dauss	#3B8282	25	1365	2026-11-17 04:15:56.03581+00	2026-11-17 04:16:02.146884+00
AJbwTrGb2	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:53:12.609282+00	2026-11-17 07:00:00.682816+00
2Z7i98C13	HEHE	#3B8282	25	1365	2026-11-17 06:59:16.697744+00	2026-11-17 07:00:01.017638+00
ctY6o1EHK	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:52:12.967093+00	2026-11-17 07:00:01.068118+00
494A3idEd	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 07:00:01.423065+00	2026-11-17 07:00:02.192716+00
Nzod-06UT	HEHE	#3B8282	25	1365	2026-11-17 07:00:01.691354+00	2026-11-17 07:00:02.944963+00
tEmq7VGkz	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 07:00:02.546536+00	2026-11-17 07:00:08.593069+00
XkGxWFcb1	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 07:00:05.294663+00	2026-11-17 07:00:08.593109+00
BWMVlMpXo	HEHE	#3B8282	25	1365	2026-11-17 07:00:03.394785+00	2026-11-17 07:00:09.409634+00
rmhONKcQw	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:00:18.15974+00	2026-11-17 07:00:33.037747+00
kpiHevjxj	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:00:42.53208+00	2026-11-17 07:00:48.833347+00
-9OBA4Ph4	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:00:52.247127+00	2026-11-17 07:01:18.331406+00
n2TAj9pmT	Dauss	#3B8282	1046.8295503660393	897.8777581812868	2026-11-19 05:53:52.906051+00	2026-11-19 05:54:05.540481+00
VmO3S02ut	HEHE	#3B8282	25	1365	2026-11-17 07:02:44.59396+00	2026-11-17 07:02:47.945134+00
V7JPqbxTe	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:02:47.614963+00	2026-11-17 07:02:55.420954+00
2Aky7Idsv	HEHE	#3B8282	25	1365	2026-11-17 07:02:56.606404+00	2026-11-17 07:02:57.887093+00
-yXO8ftWl	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:02:58.113522+00	2026-11-17 07:02:58.926494+00
nzFNteRwG	Dauss	#3B8282	25	1365	2026-11-17 04:53:29.192552+00	2026-11-17 04:57:56.930125+00
UK_Bg2xKp	Dauss	#3B8282	25	1365	2026-11-17 04:56:43.94684+00	2026-11-17 04:57:57.020094+00
T_jXMpRBx	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:05:38.686896+00	2026-11-17 07:05:44.671969+00
bEvDmuJ28	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:05:41.111821+00	2026-11-17 07:05:44.672012+00
aPybXS8W4	Dauss	#3B8282	1070.7885301502251	840.6057709125948	2026-11-17 04:43:11.22444+00	2026-11-17 04:50:17.420612+00
ejiy3NtfT	Dauss	#3B8282	158.1851317476661	987.9290557649902	2026-11-17 04:45:54.11413+00	2026-11-17 04:50:17.646719+00
I3IrOSAwc	Dauss	#3B8282	25	1365	2026-11-17 04:59:22.775264+00	2026-11-17 05:00:10.828338+00
0jGYIzqzh	Dauss	#3B8282	25	1365	2026-11-17 04:50:18.07005+00	2026-11-17 04:50:18.838795+00
dyQ0iXP8G	Dauss	#3B8282	25	1365	2026-11-17 04:50:18.790824+00	2026-11-17 04:50:19.005908+00
EL0EL3Bu0	Dauss	#3B8282	25	1365	2026-11-17 05:07:14.093763+00	2026-11-17 05:07:21.664635+00
gFtwhNb0y	Dauss	#3B8282	25	1365	2026-11-17 04:50:19.547217+00	2026-11-17 04:50:20.182833+00
w1Ur-H4Q1	Dauss	#3B8282	25	1365	2026-11-17 04:50:19.810061+00	2026-11-17 04:50:20.298037+00
HfIwAZ2Ig	Dauss	#3B8282	25	1365	2026-11-17 05:07:23.302296+00	2026-11-17 05:07:31.893192+00
0O6Y36Sqb	Dauss	#3B8282	25	1365	2026-11-17 05:07:32.441214+00	2026-11-17 05:07:33.019385+00
bMNeDzYeZ	Dauss	#3B8282	25	1365	2026-11-17 04:50:20.951896+00	2026-11-17 04:50:37.237282+00
DngYpSXpG	Dauss	#3B8282	25	1365	2026-11-17 04:50:21.401793+00	2026-11-17 04:50:37.295245+00
600UQoS5m	Dauss	#3B8282	25	1365	2026-11-17 05:07:38.866167+00	2026-11-17 05:07:39.452458+00
svCPBhTFP	Dauss	#3B8282	25	1365	2026-11-17 04:50:37.814241+00	2026-11-17 04:50:38.863932+00
rKptDqTjU	Dauss	#3B8282	25	1365	2026-11-17 04:50:38.172427+00	2026-11-17 04:50:38.959325+00
9Uy1QxM1z	Dauss	#3B8282	25	1365	2026-11-17 04:50:39.41079+00	2026-11-17 04:50:40.478323+00
qollQyVOB	Dauss	#3B8282	25	1365	2026-11-17 04:50:39.860366+00	2026-11-17 04:50:40.543406+00
lcGADfRhf	Dauss	#3B8282	25	1365	2026-11-17 04:50:41.143478+00	2026-11-17 04:50:42.282635+00
_p5cEdM2R	Dauss	#3B8282	25	1365	2026-11-17 04:50:41.39994+00	2026-11-17 04:50:42.354167+00
vbH_bLbXf	Dauss	#3B8282	25	1365	2026-11-17 05:07:39.945805+00	2026-11-17 05:08:18.577004+00
PyrD_DI7K	Dauss	#3B8282	25	1365	2026-11-17 05:08:23.299734+00	2026-11-17 05:08:24.909521+00
5fb4LMY_6	Dauss	#3B8282	25	1365	2026-11-17 04:50:42.846215+00	2026-11-17 04:50:56.253946+00
vgTj3nCbV	Dauss	#3B8282	25	1365	2026-11-17 04:50:43.262376+00	2026-11-17 04:50:56.362991+00
lPleWIFSQ	Dauss	#3B8282	25	1365	2026-11-17 04:50:57.043838+00	2026-11-17 04:50:57.784983+00
uPDxEDyYn	Dauss	#3B8282	25	1365	2026-11-17 04:50:57.434786+00	2026-11-17 04:50:57.845442+00
BVebDh-Nj	Dauss	#3B8282	25	1365	2026-11-17 05:08:27.397136+00	2026-11-17 05:08:52.33246+00
htutk7MPe	Dauss	#3B8282	25	1365	2026-11-17 04:50:58.361887+00	2026-11-17 04:50:59.439707+00
Vf74dslWI	Dauss	#3B8282	25	1365	2026-11-17 04:50:58.518589+00	2026-11-17 04:50:59.512878+00
rjaONmVs5	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:08:24.794286+00	2026-11-17 07:11:01.985182+00
nhVt7fpJP	Dauss	#3B8282	25	1365	2026-11-17 04:51:00.023238+00	2026-11-17 04:51:01.132206+00
GQ3M4Ap4e	Dauss	#3B8282	112.58533333333334	1365	2026-11-17 04:51:00.548577+00	2026-11-17 04:51:01.189818+00
g0n7QC87O	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 05:53:48.857348+00	2026-11-17 06:18:47.413711+00
bPPQQ1cjw	HEHE	#3B8282	25	1365	2026-11-17 05:47:08.719293+00	2026-11-17 06:18:47.712132+00
OBu2udsx_	Dauss	#3B8282	25	1365	2026-11-17 04:51:01.815482+00	2026-11-17 04:51:15.642954+00
nmnuosNXJ	Dauss	#3B8282	134.81672979946487	1106.2144600985396	2026-11-17 04:51:02.227033+00	2026-11-17 04:51:15.731187+00
YGk6wr9Qh	HEHE	#3B8282	25	1365	2026-11-17 06:18:48.917837+00	2026-11-17 06:18:54.967343+00
LnzKjYBB4	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:18:49.012997+00	2026-11-17 06:18:55.15434+00
sKJSzY3ME	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:19:21.819903+00	2026-11-17 06:19:21.819903+00
CFtUaveqX	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:19:27.86747+00	2026-11-17 06:19:27.86747+00
oe_YWA5Uu	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:11:04.838782+00	2026-11-17 07:11:31.153186+00
ofJf5ynQu	Dauss	#3B8282	1112.4385970381254	853.5147636553603	2026-11-17 06:19:36.349739+00	2026-11-17 06:19:42.211591+00
K_tHFyPaI	Dauss	#3B8282	257.5692459716696	1314.4021540283304	2026-11-17 05:10:01.59152+00	2026-11-17 05:11:32.215209+00
fe3tOarAW	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:19:54.226574+00	2026-11-17 06:19:59.316164+00
1i8ocQGoW	Dauss	#3B8282	138.27853720817896	868.892911374909	2026-11-17 04:51:16.263551+00	2026-11-17 04:51:42.605059+00
8gpyAT6Oe	Dauss	#3B8282	151.5395121195747	1063.9883046417804	2026-11-17 04:51:16.674742+00	2026-11-17 04:51:42.69307+00
bvsSc5K9M	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:11:31.63998+00	2026-11-17 07:11:32.889086+00
DWmsD1rsU	Dauss	#3B8282	25	1365	2026-11-17 04:51:43.214784+00	2026-11-17 04:51:45.026186+00
oE5TZJHpG	Dauss	#3B8282	25	1365	2026-11-17 04:51:43.950581+00	2026-11-17 04:51:45.082822+00
bWDYJZpqu	HEHE	#3B8282	25	1365	2026-11-17 07:11:32.692252+00	2026-11-17 07:11:33.91443+00
7yiuLXF9a	Dauss	#3B8282	25	1365	2026-11-17 04:51:45.528711+00	2026-11-17 04:51:47.170061+00
MOZFKpJmF	Dauss	#3B8282	25	1365	2026-11-17 04:51:46.044293+00	2026-11-17 04:51:47.22945+00
zxrjf8lVB	HEHE	#3B8282	25	1365	2026-11-17 07:11:34.716329+00	2026-11-17 07:11:35.404973+00
mtQRB1eJp	HEHE	#3B8282	25	1365	2026-11-17 07:11:37.819747+00	2026-11-17 07:11:49.002986+00
gogAGC2Th	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:20:03.849793+00	2026-11-17 06:20:28.297445+00
86ka60dho	Dauss	#3B8282	25	1365	2026-11-17 04:51:47.707057+00	2026-11-17 04:52:02.568082+00
4xiYee2W6	Dauss	#3B8282	25	1365	2026-11-17 04:51:48.133943+00	2026-11-17 04:52:02.675708+00
hJTpCMp6M	HEHE	#3B8282	25	1365	2026-11-17 06:20:00.201845+00	2026-11-17 06:20:28.592915+00
ZTwSm6zkT	HEHE	#3B8282	25	1365	2026-11-17 06:20:29.207485+00	2026-11-17 06:20:30.640553+00
-OvHQo_7_	HEHE	#3B8282	25	1365	2026-11-17 06:20:31.129352+00	2026-11-17 06:20:32.630287+00
D1_ikYIYf	HEHE	#3B8282	25	1365	2026-11-17 06:20:33.182793+00	2026-11-17 06:20:34.59829+00
ufFZFLFMy	HEHE	#3B8282	25	1365	2026-11-17 06:20:35.140304+00	2026-11-17 06:20:35.520757+00
5U8igivBB	HEHE	#3B8282	25	1365	2026-11-17 06:20:36.960497+00	2026-11-17 06:20:49.124033+00
NMDYq7BcP	Dauss	#3B8282	160.04460119960856	1074.7304334481971	2026-11-17 04:52:03.292679+00	2026-11-17 04:52:34.060676+00
0hdQvX-Sw	Dauss	#3B8282	25	1365	2026-11-17 04:52:03.221997+00	2026-11-17 04:53:28.420524+00
1prK_5CAn	Dauss	#3B8282	485.9865039476869	946.0362959113992	2026-11-17 04:52:36.876774+00	2026-11-17 04:53:28.487049+00
Cb-z6Y3kE	Dauss	#3B8282	198.4744118766331	1282.5250681233672	2026-11-17 05:11:44.585149+00	2026-11-17 05:17:33.519876+00
ANN7WPNe7	HEHE	#3B8282	25	1365	2026-11-17 04:54:11.43519+00	2026-11-17 04:54:23.288546+00
exsLS-61B	Dauss	#3B8282	25	1365	2026-11-17 05:17:34.142219+00	2026-11-17 05:18:05.211908+00
4qgHKrMpw	Dauss	#3B8282	25	1365	2026-11-17 05:19:57.205102+00	2026-11-17 05:19:58.681897+00
sHdgSqKq3	Dauss	#3B8282	321.5531046926066	986.4991379469611	2026-11-17 04:53:29.903708+00	2026-11-17 04:54:45.645686+00
8B-w2Wlmi	Dauss	#3B8282	1225	915	2026-11-17 04:54:45.746431+00	2026-11-17 04:55:31.102132+00
h8afTyQu4	HEHE	#3B8282	25	1365	2026-11-17 06:36:08.854618+00	2026-11-17 06:40:08.990193+00
5hMDbH5s4	HEHE	#3B8282	25	1365	2026-11-17 06:22:45.237353+00	2026-11-17 06:26:27.942941+00
qLW3zFq3w	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:22:31.3949+00	2026-11-17 06:26:28.55695+00
6aYWI6KTS	HEHE	#3B8282	25	1365	2026-11-17 06:26:28.839442+00	2026-11-17 06:26:34.985479+00
wBWyiBvwl	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:26:35.105805+00	2026-11-17 06:26:35.105805+00
kBVm90RA-	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:27:32.675121+00	2026-11-17 06:27:49.026476+00
Zsh1vcrm-	HEHE	#3B8282	25	1365	2026-11-17 06:27:30.672101+00	2026-11-17 06:27:50.123811+00
zCUj6LkPD	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:28:08.232645+00	2026-11-17 06:28:20.358207+00
Re7mQ88au	HEHE	#3B8282	25	1365	2026-11-17 06:28:07.104021+00	2026-11-17 06:28:25.57651+00
0CjTOT9Uo	Dauss	#3B8282	471.44983305179034	611.417267101692	2026-11-17 05:21:14.135268+00	2026-11-17 05:31:29.738467+00
UktwFHei3	ANG	#3B8282	183.63152470699183	621.6378925878827	2026-11-19 10:06:23.998633+00	2026-11-19 10:06:42.021288+00
8WNs6V6fI	HEHE	#3B8282	25	1365	2026-11-17 07:02:48.707123+00	2026-11-17 07:02:55.944182+00
iOVPxXhZF	HEHE	#3B8282	25	1365	2026-11-17 07:02:58.572813+00	2026-11-17 07:02:59.867769+00
Ian2iMhjO	Dauss	#3B8282	191.9728746236533	1333.250372349801	2026-11-17 05:21:34.667707+00	2026-11-17 05:31:29.850087+00
xsMflrlAb	Dauss	#3B8282	25	1365	2026-11-17 05:31:30.494644+00	2026-11-17 05:31:30.494644+00
eJLTark-e	Dauss	#3B8282	25	1365	2026-11-17 05:31:31.339485+00	2026-11-17 05:31:31.339485+00
qR-h7Kw-X	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:02:59.538765+00	2026-11-17 07:03:11.913406+00
3C2Ca9aBT	HEHE	#3B8282	25	1365	2026-11-17 07:05:38.862779+00	2026-11-17 07:05:44.972061+00
XNRCIR88n	Dauss	#3B8282	25	1365	2026-11-17 05:33:20.31971+00	2026-11-17 05:33:37.109599+00
FrCxpH3oi	Dauss	#3B8282	25	1365	2026-11-17 05:33:37.676895+00	2026-11-17 05:33:41.885+00
eaH6NPmfK	Dauss	#3B8282	25	1365	2026-11-17 05:33:42.549918+00	2026-11-17 05:33:49.198894+00
6XEOekBrf	Dauss	#3B8282	25	1365	2026-11-17 05:33:49.705615+00	2026-11-17 05:33:54.249684+00
ZoZX1-V3_	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:11:02.624432+00	2026-11-17 07:11:30.879328+00
Z7tUGy5Ew	Dauss	#3B8282	25	1365	2026-11-17 05:33:54.825616+00	2026-11-17 05:34:04.355991+00
g4GqsMUOQ	Dauss	#3B8282	25	1365	2026-11-17 05:34:04.831651+00	2026-11-17 05:34:08.99515+00
yVawo7tG3	Dauss	#3B8282	25	1365	2026-11-17 05:34:09.42221+00	2026-11-17 05:34:12.987606+00
DRzl5vzpe	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:11:35.256319+00	2026-11-17 07:11:36.601726+00
FdfJa4s5X	HEHE	#3B8282	25	1365	2026-11-17 07:11:36.197183+00	2026-11-17 07:11:37.06726+00
3cHVPc5iM	Dauss	#3B8282	25	1365	2026-11-17 05:34:13.488816+00	2026-11-17 05:34:24.40549+00
Be8tsPsHM	Dauss	#3B8282	25	1365	2026-11-17 05:34:24.932776+00	2026-11-17 05:34:31.135975+00
5yKAk44Ev	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:11:48.9841+00	2026-11-17 07:11:50.49874+00
zbIg_Wpti	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:11:51.838335+00	2026-11-17 07:11:52.750055+00
3lKgxwJh7	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:11:56.105789+00	2026-11-17 07:12:03.683551+00
NGx9ZlRWf	HEHE	#3B8282	25	1365	2026-11-17 07:12:04.608729+00	2026-11-17 07:12:10.726817+00
IG4-MAiBh	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:13:30.683337+00	2026-11-17 07:13:31.303832+00
pRIsfSaH5	Dauss	#3B8282	25	1365	2026-11-17 05:36:18.488676+00	2026-11-17 05:37:02.641405+00
aroWjldAc	Dauss	#3B8282	299.5078733954931	1120.6908358638805	2026-11-17 05:36:57.488285+00	2026-11-17 05:37:05.851342+00
3SEUfnrJB	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:13:31.915145+00	2026-11-17 07:13:33.061294+00
Q9CrYvu8T	Dauss	#3B8282	172.69720672882644	1068.7948358638805	2026-11-17 05:37:09.515124+00	2026-11-17 05:38:40.665228+00
h-W5vUwgO	Dauss	#3B8282	172.69720672882644	1055.2228358638806	2026-11-17 05:39:09.147514+00	2026-11-17 05:39:51.031499+00
9har_S_R4	Dauss	#3B8282	1063.9316845839046	841.0297730953557	2026-11-17 05:49:58.262759+00	2026-11-17 05:53:39.54416+00
T-P6zoANi	HEHE	#3B8282	25	1365	2026-11-17 05:42:25.0776+00	2026-11-17 05:43:17.094008+00
F-mRK1fgn	Dauss	#3B8282	178.81933724033956	1049.100705352367	2026-11-17 05:44:32.77989+00	2026-11-17 05:45:01.579527+00
u9w_VtFTR	Dauss	#3B8282	1225	915	2026-11-17 05:45:01.676883+00	2026-11-17 05:45:03.060247+00
6-nyK9T_9	Dauss	#3B8282	1083.5966289037644	872.7346289037658	2026-11-17 05:45:04.082469+00	2026-11-17 05:45:11.229816+00
xTpLD9JAh	Dauss	#3B8282	25	1365	2026-11-17 05:45:11.5315+00	2026-11-17 05:45:13.622659+00
x7xPvAFNY	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:13:35.755462+00	2026-11-17 07:15:31.091331+00
yPtbrSZga	Dauss	#3B8282	132.96933333333334	1365	2026-11-17 05:45:14.468471+00	2026-11-17 05:45:24.897862+00
fW6kdlM0M	Dauss	#3B8282	132.96933333333334	1365	2026-11-17 05:46:03.551407+00	2026-11-17 05:46:09.830174+00
5qt4WSMQY	Dauss	#3B8282	304.32770506799807	1193.6416282653365	2026-11-17 05:47:32.970266+00	2026-11-17 05:47:38.0548+00
LsE_SpIB5	Dauss	#3B8282	1068.4112998075939	852.9732998075954	2026-11-17 05:47:38.14576+00	2026-11-17 05:47:45.29495+00
QFV4ZX14R	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:38:58.846652+00	2026-11-17 06:47:43.752821+00
5ZlRb8qzB	HEHE	#3B8282	25	1365	2026-11-17 06:44:10.723694+00	2026-11-17 06:47:43.981305+00
gGYBCmj-m	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:30:28.935259+00	2026-11-17 06:47:44.177102+00
rKle3B3LV	HEHE	#3B8282	25	1365	2026-11-17 06:47:44.963751+00	2026-11-17 06:47:50.954188+00
aA0uu_IHg	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:48:07.146306+00	2026-11-17 06:48:07.160339+00
8ozidbKkz	HEHE	#3B8282	25	1365	2026-11-17 06:49:23.685065+00	2026-11-17 06:49:25.068678+00
U3nPn5RM8	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:13:33.994386+00	2026-11-17 07:19:09.810378+00
dV19SiXd7	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:19:11.161909+00	2026-11-17 07:19:17.090039+00
v-T2MqCgo	HEHE	#3B8282	25	1365	2026-11-17 06:49:25.675257+00	2026-11-17 06:50:14.934664+00
lyQo96zbw	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:50:16.632832+00	2026-11-17 06:50:17.839475+00
5G6T39s_O	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:50:18.442481+00	2026-11-17 06:50:19.392704+00
c8c4wobIQ	HEHE	#3B8282	25	1365	2026-11-17 06:50:19.573813+00	2026-11-17 06:50:20.188011+00
J2msnXktZ	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:19:25.974107+00	2026-11-17 07:20:06.440302+00
dXHm3g5QY	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:50:20.075137+00	2026-11-17 06:50:39.632195+00
mval_EJGT	Dauss	#3B8282	126.04554924258733	1226.898196492615	2026-11-17 05:47:45.370407+00	2026-11-17 05:49:58.08999+00
kvI0zpQvQ	HEHE	#3B8282	25	1365	2026-11-17 06:50:40.549542+00	2026-11-17 06:51:07.93024+00
8HrkPThty	HEHE	#3B8282	25	1365	2026-11-17 06:51:08.747215+00	2026-11-17 06:51:09.915447+00
tINY1uJD5	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:51:09.704541+00	2026-11-17 06:51:10.763601+00
Fan6HO0b-	HEHE	#3B8282	25	1365	2026-11-17 06:51:10.631987+00	2026-11-17 06:51:11.954651+00
ejMrrYYAr	HEHE	#3B8282	25	1365	2026-11-17 06:51:12.682955+00	2026-11-17 06:51:13.982595+00
PghYCKQwT	Dauss	#3B8282	1063.9316845839046	811.9357730953557	2026-11-17 06:51:13.846495+00	2026-11-17 06:51:26.167278+00
747gnPPn-	HEHE	#3B8282	25	1365	2026-11-17 07:23:11.665151+00	2026-11-17 07:24:49.753382+00
cOVhn4BR0	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:25:07.107604+00	2026-11-17 07:25:07.107604+00
akJKe5m4k	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:26:20.894949+00	2026-11-17 07:26:22.204305+00
e3Bbw7INa	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:26:33.623606+00	2026-11-17 07:26:35.303766+00
HAss9O0EP	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:26:37.823167+00	2026-11-17 07:26:47.82482+00
LspkFuEKJ	HEHE	#3B8282	25	1365	2026-11-17 07:26:45.96059+00	2026-11-17 07:26:49.036051+00
Pn3n3dcii	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:26:50.83957+00	2026-11-17 07:26:52.26138+00
drWMi_icT	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:26:57.291678+00	2026-11-17 07:27:03.36834+00
QlY-tldIf	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:27:46.223921+00	2026-11-17 07:27:56.815668+00
yVxZK04d7	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:28:13.116625+00	2026-11-17 07:29:09.489508+00
Mymow9WIw	HEHE	#3B8282	25	1365	2026-11-17 07:27:31.023122+00	2026-11-17 07:29:10.070817+00
ekbkksAeJ	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:29:09.880148+00	2026-11-17 07:29:11.285929+00
OesbG22c2	HEHE	#3B8282	25	1365	2026-11-17 07:29:11.719643+00	2026-11-17 07:29:12.442234+00
OWUaJHj_5	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:29:11.899988+00	2026-11-17 07:29:34.050223+00
c8XXzBdW_	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:29:13.975294+00	2026-11-17 07:29:34.28229+00
aISC_cgdV	HEHE	#3B8282	25	1365	2026-11-17 07:29:14.945663+00	2026-11-17 07:29:34.992554+00
pPNOyrbRh	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:29:34.730686+00	2026-11-17 07:29:36.487248+00
hxMBEcC8s	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:29:37.419057+00	2026-11-17 07:29:38.749727+00
QM86o0K6f	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:29:39.547121+00	2026-11-17 07:29:41.257339+00
eonm7gN5s	HEHE	#3B8282	25	1365	2026-11-17 07:29:47.716042+00	2026-11-17 07:29:47.716042+00
CrVMWylWV	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:29:47.20679+00	2026-11-17 07:29:48.034098+00
zBtcTudes	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:29:42.015093+00	2026-11-17 07:29:48.034097+00
X-V1RFvGi	Dauss	#3B8282	1060.1298149361744	824.9096829739703	2026-11-17 07:30:01.771964+00	2026-11-17 07:32:47.864096+00
Ndy2qi-LG	HEHE	#3B8282	25	1365	2026-11-17 07:30:53.349056+00	2026-11-17 07:32:47.955297+00
26B7GumGy	Dauss	#3B8282	1060.1298149361744	824.9096829739703	2026-11-17 07:32:48.63944+00	2026-11-17 07:32:59.305372+00
ost8DjDG-	Dauss	#3B8282	1093.1266361513929	1257.3812854185007	2026-11-22 11:35:24.821666+00	2026-11-22 11:35:29.158471+00
J6-6GmtOh	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:01:18.924737+00	2026-11-17 07:02:42.943275+00
GGx4wzoaq	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:01:51.958019+00	2026-11-17 07:02:43.072281+00
Ph61STQEp	Dauss	#3B8282	1055.8210644286241	881.7292360821533	2026-11-17 08:50:49.798725+00	2026-11-17 08:51:39.343624+00
EN2q_8fju	melon	#3B8282	1073.6145959175897	780.956595917591	2026-11-17 15:30:09.895393+00	2026-11-17 15:30:57.45799+00
QMOVOGSsB	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:02:49.490417+00	2026-11-17 07:02:55.675956+00
AxV0KE7lC	Dauss	#3B8282	1055.8210644286241	881.7292360821533	2026-11-17 08:58:23.234666+00	2026-11-17 08:58:41.686026+00
DAndKjKpc	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:01:33.566928+00	2026-11-17 07:02:04.290921+00
YOzPLKmlO	Dauss	#3B8282	1055.8210644286241	881.7292360821533	2026-11-17 09:23:10.362935+00	2026-11-17 09:23:28.096066+00
hROb6iGdW	melon	#3B8282	919.0762609431222	939.5790476392177	2026-11-17 15:37:40.741741+00	2026-11-17 15:38:28.430104+00
dvJaZ3z-0	Dauss	#3B8282	1174.2811793553738	841.5637226068379	2026-11-17 09:25:01.731193+00	2026-11-17 10:29:40.115694+00
u_9y1F-68	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:03:40.430456+00	2026-11-17 07:05:38.188074+00
rLu_jZTg1	Admin	#3B8282	750.1108607213228	715.5983760145674	2026-11-18 04:54:39.089375+00	2026-11-18 04:57:49.246868+00
gAy15yqO8	Dauss	#3B8282	1073.8879999999986	915	2026-11-17 07:44:46.358926+00	2026-11-17 07:47:01.032563+00
BhgCuQ7sk	HEHE	#3B8282	25	1365	2026-11-17 08:19:12.398183+00	2026-11-17 08:25:11.548003+00
BU9mPQGVf	HEHE	#3B8282	25	1365	2026-11-17 08:25:12.133085+00	2026-11-17 08:25:22.48612+00
OhOLWCnd-	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:25:24.473239+00	2026-11-17 08:25:27.392747+00
NsflA67d3	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:25:30.133407+00	2026-11-17 08:25:34.173548+00
IaAeyjiQv	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:25:28.797351+00	2026-11-17 08:25:34.197416+00
8b5CrsAEs	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:25:36.930337+00	2026-11-17 08:25:41.807589+00
Rbl_8cgA8	HEHE	#3B8282	25	1365	2026-11-17 08:25:35.306251+00	2026-11-17 08:25:42.552141+00
MwG4WB732	HEHE	#3B8282	25	1365	2026-11-17 08:25:43.329028+00	2026-11-17 08:25:47.425066+00
MvEbJkhj1	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:25:50.574805+00	2026-11-17 08:26:08.176572+00
6zZGoCmYg	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:05:51.265549+00	2026-11-17 07:11:02.388415+00
pmScg1Ams	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:26:10.752518+00	2026-11-17 08:26:20.913177+00
mDYPENtUg	HEHE	#3B8282	25	1365	2026-11-17 08:26:22.143026+00	2026-11-17 08:26:26.423696+00
WLOsOVvWb	HEHE	#3B8282	25	1365	2026-11-17 07:11:03.741484+00	2026-11-17 07:11:31.95512+00
nqimzYIUx	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:11:33.513205+00	2026-11-17 07:11:34.634181+00
X8QFzqJet	Dauss	#3B8282	1051.479064428624	881.7292360821533	2026-11-17 08:26:35.483085+00	2026-11-17 08:26:45.216759+00
6jb09zXXH	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:11:37.123053+00	2026-11-17 07:11:48.315162+00
iIBSxC_Db	HEHE	#3B8282	25	1365	2026-11-17 07:11:49.825392+00	2026-11-17 07:11:51.145775+00
3ChB5DZLJ	HEHE	#3B8282	25	1365	2026-11-17 07:11:51.917841+00	2026-11-17 07:11:52.941425+00
HWNFjEwFP	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:11:53.466425+00	2026-11-17 07:11:55.444605+00
4rjklza_2	HEHE	#3B8282	25	1365	2026-11-17 07:11:53.711104+00	2026-11-17 07:11:55.930776+00
5R4JKKwjd	HEHE	#3B8282	25	1365	2026-11-17 07:11:56.545694+00	2026-11-17 07:12:03.968066+00
z_GOs9XrL	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:12:04.42207+00	2026-11-17 07:12:10.57031+00
FU5yQlAF8	Dauss	#3B8282	1051.479064428624	881.7292360821533	2026-11-17 08:26:45.520917+00	2026-11-17 08:27:10.268158+00
YdJo_ZCdR	HEHE	#3B8282	25	1365	2026-11-17 08:26:45.92566+00	2026-11-17 08:27:10.527423+00
ggTScU8ep	HEHE	#3B8282	25	1365	2026-11-17 08:27:18.152841+00	2026-11-17 08:27:21.500755+00
jMG_D4t1i	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:12:56.103617+00	2026-11-17 07:13:30.191907+00
q1DWTfg2O	Dauss	#3B8282	1051.479064428624	881.7292360821533	2026-11-17 08:27:24.215277+00	2026-11-17 08:27:26.000841+00
bg6v-GV95	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:13:33.420627+00	2026-11-17 07:13:33.529328+00
LiHhvxQXG	HEHE	#3B8282	25	1365	2026-11-17 07:13:31.784827+00	2026-11-17 07:13:33.965595+00
Npg-y5eZb	Dauss	#3B8282	1051.479064428624	881.7292360821533	2026-11-17 08:27:26.466626+00	2026-11-17 08:27:30.225908+00
qHzcphuBw	Dauss	#3B8282	1051.479064428624	881.7292360821533	2026-11-17 08:27:29.523424+00	2026-11-17 08:27:30.58065+00
CxD0EVXSR	HEHE	#3B8282	25	1365	2026-11-17 08:27:31.229308+00	2026-11-17 08:27:47.476592+00
RzJYlvkPD	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:44:52.747518+00	2026-11-17 07:54:15.974252+00
CH8xrl3nF	Dauss	#3B8282	1055.8210644286241	881.7292360821533	2026-11-17 08:27:50.36776+00	2026-11-17 08:28:04.024718+00
Q_j-OUu-i	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:55:09.57504+00	2026-11-17 07:55:10.875215+00
Xk4pobHUM	HEHE	#3B8282	25	1365	2026-11-17 07:55:10.148064+00	2026-11-17 07:55:11.605437+00
cPYr96HWC	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:55:36.607389+00	2026-11-17 07:55:36.99688+00
hnc46ZFY0	HEHE	#3B8282	25	1365	2026-11-17 07:55:52.118483+00	2026-11-17 07:55:52.543905+00
IIkF9wBZq	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:55:52.760315+00	2026-11-17 07:55:54.334092+00
CCCuW5BDz	HEHE	#3B8282	25	1365	2026-11-17 07:55:53.667751+00	2026-11-17 07:55:54.413921+00
FJrXbEEWH	HEHE	#3B8282	25	1365	2026-11-17 07:55:54.981353+00	2026-11-17 07:55:56.474256+00
a_MTiI_Vh	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:55:57.147049+00	2026-11-17 07:56:08.636903+00
8_dIwSmH0	HEHE	#3B8282	25	1365	2026-11-17 07:55:57.082794+00	2026-11-17 07:56:09.457917+00
BcMUi8Z3o	HEHE	#3B8282	25	1365	2026-11-17 07:56:10.091334+00	2026-11-17 07:56:12.404715+00
Bl_S_-Uxz	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:56:25.459501+00	2026-11-17 07:56:25.979421+00
5ZNVmxlTY	HEHE	#3B8282	25	1365	2026-11-17 07:56:26.998785+00	2026-11-17 07:56:39.370121+00
1-v5CJn2j	Admin	#3B8282	1627.2619075958296	1121.5561344860707	2026-11-18 05:33:48.464918+00	2026-11-18 05:40:55.560085+00
Hv5mUIuLJ	Dauss	#3B8282	1067.3327481158062	881.0829887746221	2026-11-17 07:56:50.809771+00	2026-11-17 07:57:09.22384+00
mwQYV3Qs5	Dauss	#3B8282	403.2472018210549	786.6289823228303	2026-11-18 05:43:37.744168+00	2026-11-18 05:44:23.253179+00
9obUxeVOK	Dauss	#3B8282	270.88639219970844	678.4573920974715	2026-11-18 05:45:53.387514+00	2026-11-18 05:46:41.017938+00
MCCnSfWws	Dauss	#3B8282	1009.4424454498759	823.9703813971965	2026-11-18 05:46:41.128034+00	2026-11-18 05:47:10.223513+00
LSA9v04uV	Dauss	#3B8282	1090.030427067856	914.831309822573	2026-11-17 08:00:01.90459+00	2026-11-17 08:02:24.913669+00
lUFk18IBj	Dauss	#3B8282	531.2286082820218	569.2739469222255	2026-11-18 05:41:03.726023+00	2026-11-18 06:28:52.392304+00
0mJXD0gQG	Dauss	#3B8282	1141.670172511576	834.8220273601534	2026-11-17 08:02:30.405431+00	2026-11-17 08:02:48.881397+00
Brbyy67Sp	Dauss	#3B8282	1225	915	2026-11-17 08:03:51.687336+00	2026-11-17 08:03:57.611452+00
Cj-mcHEOd	Dauss	#3B8282	1105.4261247174948	805.8183793095326	2026-11-17 07:15:34.99096+00	2026-11-17 07:19:09.801603+00
y0-NMAQkS	HEHE	#3B8282	25	1365	2026-11-17 07:13:34.660948+00	2026-11-17 07:19:09.983473+00
GGn0qwS2s	HEHE	#3B8282	25	1365	2026-11-17 07:19:11.165713+00	2026-11-17 07:19:17.027288+00
fjd8MUdBx	Dauss	#3B8282	1053.3972077577876	801.4012962692384	2026-11-17 07:19:15.646118+00	2026-11-17 07:19:17.090087+00
CTI95TfR9	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:20:23.977018+00	2026-11-17 07:24:54.940074+00
ZJC-8StQj	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:24:55.2435+00	2026-11-17 07:24:55.2435+00
kF1c5cpP4	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:24:58.24372+00	2026-11-17 07:24:58.24372+00
PYtNrY9gp	HEHE	#3B8282	25	1365	2026-11-17 07:24:58.316742+00	2026-11-17 07:24:58.316742+00
hL_TzzqeK	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:25:18.204372+00	2026-11-17 07:25:24.18936+00
4rUlxtEDL	HEHE	#3B8282	25	1365	2026-11-17 08:32:06.143611+00	2026-11-17 08:36:06.624523+00
BI-Ce7MY_	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:26:22.681411+00	2026-11-17 07:26:32.848463+00
dLF0uP1Z3	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:26:36.116549+00	2026-11-17 07:26:37.108018+00
OtLvo7e7Z	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:26:48.42235+00	2026-11-17 07:26:50.067154+00
jC0Fbd9lM	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:26:53.159671+00	2026-11-17 07:26:54.66732+00
te7TjPXrk	Dauss	#3B8282	1078.2795539131482	837.0614151927159	2026-11-17 07:26:55.431544+00	2026-11-17 07:26:56.75802+00
vimOvAH7c	Dauss	#3B8282	1098.6455994488979	893.1135854311472	2026-11-17 11:00:41.21148+00	2026-11-17 11:20:23.644858+00
f4dUfCLXN	Dauss	#3B8282	1055.5074467038914	925.5595689081644	2026-11-17 11:32:29.915075+00	2026-11-17 11:32:37.780595+00
7WcqofCFt	Dauss	#3B8282	1044.534051278593	947.7515750071946	2026-11-17 11:42:11.380433+00	2026-11-17 11:42:20.865487+00
sPUfvDW5Y	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:54:16.739634+00	2026-11-17 07:54:18.117047+00
8pyJzOyuv	HEHE	#3B8282	25	1365	2026-11-17 07:32:49.313107+00	2026-11-17 07:32:59.835482+00
w6wmVitek	Dauss	#3B8282	1174.2811793553738	841.5637226068379	2026-11-17 10:32:06.261152+00	2026-11-17 10:32:06.363217+00
LWgq0BnTc	Dauss	#3B8282	1035.6856716477455	938.579905263784	2026-11-17 11:24:45.650948+00	2026-11-17 11:24:49.755158+00
YBRicAPiZ	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:55:11.533046+00	2026-11-17 07:55:35.85338+00
2czhMUS3R	Dauss	#3B8282	1073.3872399999925	915	2026-11-18 06:28:52.480289+00	2026-11-18 06:29:08.577901+00
gyOoAzG_d	HEHE	#3B8282	25	1365	2026-11-17 07:55:36.461679+00	2026-11-17 07:55:37.529695+00
ZL5nVo2En	Dauss	#3B8282	1099.6428811775434	923.1927451082449	2026-11-17 11:32:38.107051+00	2026-11-17 11:32:49.30172+00
NNpJHgGVN	Admin	#3B8282	1050.2204339258228	986.0853698086377	2026-11-19 08:48:14.878888+00	2026-11-19 08:49:02.040187+00
mZSs4kCmi	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:55:37.840105+00	2026-11-17 07:55:51.128466+00
vy2CZi_mQ	Dauss	#3B8282	1034.7526387757027	857.4365741922132	2026-11-17 08:53:11.611037+00	2026-11-17 08:54:07.576516+00
5zaYI3NJZ	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:55:51.71094+00	2026-11-17 07:55:52.239462+00
WB_c1JBZO	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:55:54.977797+00	2026-11-17 07:55:56.465711+00
FpbbcfRU-	Dauss	#3B8282	486.0277742100558	1167.7682257899432	2026-11-18 06:54:44.372475+00	2026-11-18 06:54:59.568742+00
c07rk7Ulo	Dauss	#3B8282	1038.7875551419993	844.4078822202023	2026-11-17 13:46:37.210081+00	2026-11-17 13:46:55.857197+00
acatC-EUW	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:56:12.490433+00	2026-11-17 07:56:21.036598+00
4BG3QBWyq	melon	#3B8282	1073.6145959175897	780.956595917591	2026-11-17 15:28:19.074985+00	2026-11-17 15:29:50.89467+00
99nM2VXjt	HEHE	#3B8282	25	1365	2026-11-17 07:56:21.905834+00	2026-11-17 07:56:23.426302+00
zpa0-inb7	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:57:19.955896+00	2026-11-17 07:57:19.955896+00
Ow8HDpSMZ	HEHE	#3B8282	25	1365	2026-11-17 08:14:17.272748+00	2026-11-17 08:19:11.749563+00
pdYxsBc8J	Dauss	#3B8282	556.1025953045236	1256.0324549840814	2026-11-18 06:58:30.260768+00	2026-11-18 06:59:00.112529+00
LYT2HvgDE	Dauss	#3B8282	508.3052321488871	1224.4534544605633	2026-11-18 06:56:38.272692+00	2026-11-18 06:59:00.113041+00
m58KkG_vm	Dauss	#3B8282	911.0294704617143	1363.3777970506599	2026-11-17 13:46:56.042445+00	2026-11-17 13:47:43.787081+00
zRTFejzJo	Dauss	#3B8282	1055.8210644286241	881.7292360821533	2026-11-17 09:11:10.062802+00	2026-11-17 09:12:37.241891+00
-P-6qwND6	Dauss	#3B8282	412.3788405140219	1172.309159485977	2026-11-17 15:20:33.126947+00	2026-11-17 15:20:51.849834+00
7cMJgN7fO	melon	#3B8282	960.4470725757112	935.3253677171197	2026-11-17 15:30:57.54971+00	2026-11-17 15:31:57.935114+00
eUER9io0Q	HEHE	#3B8282	25	1365	2026-11-17 08:01:12.218166+00	2026-11-17 08:02:45.566856+00
qddeJdpDj	HEHE	#3B8282	25	1365	2026-11-17 08:03:50.643763+00	2026-11-17 08:03:51.542057+00
aZPd0DrSF	Dauss	#3B8282	1046.9215675445287	907.3364245119602	2026-11-17 15:38:27.117679+00	2026-11-17 15:38:32.837772+00
mPXXjiOiX	HEHE	#3B8282	25	1365	2026-11-17 08:03:52.157235+00	2026-11-17 08:03:58.297381+00
QawE0qbqY	Dauss	#3B8282	493.11599306502245	1148.4668424465326	2026-11-18 06:55:17.164948+00	2026-11-18 06:56:16.510804+00
zo9nRml9E	HEHE	#3B8282	25	1365	2026-11-17 08:04:20.807408+00	2026-11-17 08:09:11.563735+00
iAW5WuDGy	Dauss	#3B8282	1124.5435503660387	923.6524248479536	2026-11-19 04:06:44.239964+00	2026-11-19 04:07:50.189984+00
qBZj7b7u9	Admin	#3B8282	368.70531412221885	1169.0184885643234	2026-11-18 03:17:01.538865+00	2026-11-18 03:58:12.347216+00
C2RvR6Nav	Dauss	#3B8282	1033.632504563958	943.75312153136	2026-11-18 03:58:55.290672+00	2026-11-18 03:58:59.336571+00
Yn4HnXkV5	Dauss	#3B8282	263.79422451793846	1256.2161754821188	2026-11-18 04:46:46.787482+00	2026-11-18 04:46:55.477144+00
8Eu0xvLwR	Admin	#3B8282	1056.8171563069518	841.6922539302468	2026-11-19 03:40:40.479474+00	2026-11-19 04:08:34.344207+00
6tzU2c_7t	Dauss	#3B8282	1064.056085769306	951.0765561113539	2026-11-19 05:54:22.050539+00	2026-11-19 05:54:36.991113+00
T9jFc90K-	Dauss	#3B8282	602.0852534171718	1136.5150136800753	2026-11-19 05:54:37.089786+00	2026-11-19 05:54:53.734854+00
-r2-ro4-D	Admin	#3B8282	963.5083539258219	1044.5978498086376	2026-11-19 09:04:07.407194+00	2026-11-19 09:08:59.787836+00
EDvSJzK4Y	HEHE	#3B8282	25	1365	2026-11-17 08:09:12.593895+00	2026-11-17 08:12:57.299341+00
jIthmNO_6	Dauss	#3B8282	988.2661015496483	881.2019157009124	2026-11-17 08:04:19.398083+00	2026-11-17 08:12:57.678713+00
kduYryMsO	Dauss	#3B8282	950.7061559432424	870.766525425167	2026-11-17 08:06:27.270898+00	2026-11-17 08:12:57.678755+00
LvACFfXQx	Dauss	#3B8282	1225	915	2026-11-17 08:13:08.131215+00	2026-11-17 08:13:14.141383+00
LHEXwNYvW	Dauss	#3B8282	1225	915	2026-11-17 08:13:34.035918+00	2026-11-17 08:13:34.835036+00
fH5ugkLZA	Dauss	#3B8282	1225	915	2026-11-17 08:13:35.138259+00	2026-11-17 08:13:36.433552+00
ANDYoG5bA	HEHE	#3B8282	25	1365	2026-11-17 08:13:36.173586+00	2026-11-17 08:13:37.462443+00
d32I3ku07	Dauss	#3B8282	1225	915	2026-11-17 08:13:37.07927+00	2026-11-17 08:13:38.229904+00
sO13pj5ot	HEHE	#3B8282	25	1365	2026-11-17 08:13:37.995191+00	2026-11-17 08:13:39.48328+00
tgdtXk_Rr	Dauss	#3B8282	1225	915	2026-11-17 08:13:38.986447+00	2026-11-17 08:13:45.162393+00
u5DDFFxLP	HEHE	#3B8282	25	1365	2026-11-17 08:13:40.04445+00	2026-11-17 08:13:46.149627+00
0j8FHhU_6	Admin	#3B8282	984.6373070173801	920.3190632198178	2026-11-19 03:10:06.306953+00	2026-11-19 03:17:15.151213+00
CSgfnm1_A	Dauss	#3B8282	1083.336870607563	869.8087130012987	2026-11-19 03:17:02.910175+00	2026-11-19 03:17:20.282177+00
tpwQlRk03	Dauss	#3B8282	1076.363580839902	890.5482475065694	2026-11-17 08:13:51.316528+00	2026-11-17 08:14:14.235295+00
8mVRKakhT	Dauss	#3B8282	1076.363580839902	890.5482475065694	2026-11-17 08:14:14.319083+00	2026-11-17 08:14:15.441053+00
T39qd2Nz1	HEHE	#3B8282	25	1365	2026-11-17 08:14:14.919914+00	2026-11-17 08:14:16.489635+00
ju3ru5Mmy	Admin	#3B8282	750.1108607213228	715.5983760145674	2026-11-18 04:50:20.962499+00	2026-11-18 04:54:38.497316+00
33oLBdF0J	ANG	#3B8282	183.63152470699183	621.6378925878827	2026-11-19 10:06:55.525118+00	2026-11-19 10:14:05.818595+00
dQjDPJ-jj	Admin	#3B8282	980.8764869916722	1275.3106651284293	2026-11-20 01:20:40.482739+00	2026-11-20 01:20:51.432637+00
16-6LjaZQ	Admin	#3B8282	980.8764869916722	1275.3106651284293	2026-11-20 01:20:52.977806+00	2026-11-20 01:20:53.195712+00
E1Dk2tdkg	Admin	#3B8282	212.24058517500603	1352.984666863715	2026-11-21 06:04:23.600392+00	2026-11-21 06:14:28.559591+00
M6R-M_tgo	Admin	#3B8282	540.6663003409287	1051.3561695103792	2026-11-20 01:21:58.672187+00	2026-11-20 02:27:09.339066+00
qdyK_5Wwu	Dauss	#3B8282	184.6434235608803	841.2674235608798	2026-11-20 02:29:13.816121+00	2026-11-20 02:29:24.890853+00
Y1uxRjMpF	Admin	#3B8282	1234.1414977558481	831.3072094838977	2026-11-21 06:16:51.252054+00	2026-11-21 06:18:16.948534+00
2DTYXdXt6	Admin	#3B8282	81.37267999999983	1365	2026-11-21 06:28:29.731814+00	2026-11-21 06:28:34.889834+00
GVrHOjXeb	Dauss	#3B8282	148.87575249343084	1340.5482475065685	2026-11-21 06:41:42.015347+00	2026-11-21 06:41:52.345591+00
THW741HbU	Dauss	#3B8282	855.4940354420041	1195.5214495073988	2026-11-20 03:13:18.057008+00	2026-11-20 03:15:23.129106+00
nRG1kaoeL	Admin	#3B8282	1305.4687142496448	1038.4979562104395	2026-11-20 04:02:39.878314+00	2026-11-20 04:02:58.654341+00
Icq0N6Wf-	Dauss	#3B8282	1225	915	2026-11-21 06:52:36.646923+00	2026-11-21 06:53:27.917903+00
0THDV8yrf	Dauss	#3B8282	1072.4067935219894	948.6529331004692	2026-11-19 03:17:22.411864+00	2026-11-19 03:23:35.020571+00
-B0THgShf	Dauss	#3B8282	796.0739922423529	1286.0013494199277	2026-11-18 06:29:08.649283+00	2026-11-18 08:21:46.365099+00
XeFAxzDYY	Dauss	#3B8282	1191.0903588703884	1575.6664704280888	2026-11-20 06:45:31.028228+00	2026-11-20 06:46:25.714148+00
mixFYUh3-	Superadmin	#3B8282	1225	915	2026-11-20 07:54:00.59789+00	2026-11-20 07:54:00.609887+00
zl9GtutpE	Admin	#3B8282	940.1046751306128	977.5754456863244	2026-11-18 09:48:45.349149+00	2026-11-18 10:13:40.20305+00
v-nwFmZbl	Dauss	#3B8282	402.15129127143575	1199.9047087285637	2026-11-20 07:56:33.852459+00	2026-11-20 08:00:31.7778+00
0puuPmuXx	melon	#3B8282	1329.311605581586	680.004952655369	2026-11-18 07:07:46.688773+00	2026-11-18 07:08:19.980589+00
n71eeGg5I	HEHE	#3B8282	25	1365	2026-11-18 06:56:39.776193+00	2026-11-18 08:26:26.523573+00
hHayJHHr4	Admin	#3B8282	984.6373070173801	920.3190632198178	2026-11-19 03:17:16.193001+00	2026-11-19 03:28:38.913581+00
GPNrPRKs7	Dauss	#3B8282	1041.7164736004097	888.4732530220487	2026-11-19 03:42:01.075703+00	2026-11-19 03:42:39.069164+00
Lr5vfZyBd	Dauss	#3B8282	318.6600320132107	1077.5820304375138	2026-11-19 03:48:21.303142+00	2026-11-19 03:49:04.594483+00
ByYT8N7Qy	nooogel	#3B8282	1046.7414708580636	1537.0327276135956	2026-11-19 09:42:55.481901+00	2026-11-19 09:43:50.147846+00
qSaLO0AeD	Dauss	#3B8282	1176.7448422919529	962.969157708047	2026-11-19 04:06:00.532016+00	2026-11-19 04:06:17.45334+00
JP0Wdj_t5	Dauss	#3B8282	1161.7455762755008	869.0564439991855	2026-11-19 05:59:31.757771+00	2026-11-19 06:45:54.171241+00
4TPs_r7Hg	Dauss	#3B8282	451.383375282623	1030.0429362425975	2026-11-19 04:06:17.568696+00	2026-11-19 04:06:44.137409+00
D5bFRxxH3	nooogel	#3B8282	1286.3510668515185	869.3825600291561	2026-11-19 09:43:50.291837+00	2026-11-19 09:44:28.502855+00
o7S-AK6GK	Dauss	#3B8282	749.1211990654891	1285.345739224069	2026-11-18 09:10:21.42333+00	2026-11-18 09:11:12.523076+00
rYLrAxZvS	Dauss	#3B8282	1060.1298149361744	824.9096829739703	2026-11-17 07:32:50.460773+00	2026-11-17 07:32:59.586138+00
Jq2BRj9Hw	Dauss	#3B8282	1060.1298149361744	824.9096829739703	2026-11-17 07:33:00.116567+00	2026-11-17 07:33:00.116567+00
WGm3iLuGn	HEHE	#3B8282	25	1365	2026-11-17 07:33:00.727735+00	2026-11-17 07:33:00.727735+00
0k4JgxrJA	Dauss	#3B8282	1060.1298149361744	824.9096829739703	2026-11-17 07:33:02.24492+00	2026-11-17 07:33:02.24492+00
0bAwmUEMD	HEHE	#3B8282	25	1365	2026-11-17 07:34:16.308958+00	2026-11-17 07:34:16.308958+00
IG7GMrqEa	Dauss	#3B8282	1060.1298149361744	824.9096829739703	2026-11-17 07:34:36.227532+00	2026-11-17 07:34:37.741915+00
nvAk09aqs	Dauss	#3B8282	1085.567056893539	946.0496326446957	2026-11-17 10:32:11.025154+00	2026-11-17 10:32:49.650182+00
iou46sUVl	Dauss	#3B8282	1060.1298149361744	824.9096829739703	2026-11-17 07:34:38.103508+00	2026-11-17 07:35:03.483405+00
-dKxmvWx5	Dauss	#3B8282	1060.1298149361744	824.9096829739703	2026-11-17 07:34:40.90541+00	2026-11-17 07:35:03.868162+00
SAH6Wup_v	Dauss	#3B8282	1060.1298149361744	824.9096829739703	2026-11-17 07:35:04.558554+00	2026-11-17 07:35:04.93494+00
mcO-dE_gD	Dauss	#3B8282	1060.1298149361744	824.9096829739703	2026-11-17 07:35:05.606802+00	2026-11-17 07:35:07.07381+00
OklZsw_nR	Dauss	#3B8282	1055.8210644286241	881.7292360821533	2026-11-17 08:54:51.622717+00	2026-11-17 08:56:37.813349+00
larPkLnOO	Dauss	#3B8282	1055.8210644286241	881.7292360821533	2026-11-17 09:13:26.623909+00	2026-11-17 09:13:26.623909+00
_xeea32rr	Dauss	#3B8282	1060.1298149361744	824.9096829739703	2026-11-17 07:35:07.631048+00	2026-11-17 07:35:17.163591+00
8hZ2HLxpV	Dauss	#3B8282	1060.1298149361744	824.9096829739703	2026-11-17 07:35:11.631766+00	2026-11-17 07:35:17.421002+00
1O7E0RwK2	Dauss	#3B8282	1060.1298149361744	824.9096829739703	2026-11-17 07:35:19.901687+00	2026-11-17 07:35:26.145468+00
0Os68nHpe	Dauss	#3B8282	1060.1298149361744	824.9096829739703	2026-11-17 07:35:17.743444+00	2026-11-17 07:35:26.145429+00
Rt78Z_F-5	Dauss	#3B8282	1076.363580839902	890.5482475065694	2026-11-17 08:14:16.074298+00	2026-11-17 08:25:21.450088+00
zFNN-Og9h	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:14:17.500189+00	2026-11-17 08:25:21.866015+00
C9sXos5JZ	HEHE	#3B8282	25	1365	2026-11-17 08:25:23.19029+00	2026-11-17 08:25:27.495046+00
9rFTm5j6R	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:25:22.077356+00	2026-11-17 08:25:28.091461+00
BZ9GRQHGu	Dauss	#3B8282	470.75869379857886	1305.260598705214	2026-11-17 07:42:43.497432+00	2026-11-17 07:44:45.992812+00
1srg0_qPN	Dauss	#3B8282	1081.43777068045	880.5376387182457	2026-11-17 07:35:57.65824+00	2026-11-17 07:37:14.27676+00
M0ASn3_su	HEHE	#3B8282	25	1365	2026-11-17 08:25:28.157602+00	2026-11-17 08:25:34.526353+00
UhLipr80v	Dauss	#3B8282	839.0794894739956	1353.3952230180469	2026-11-17 07:41:44.555494+00	2026-11-17 07:44:52.64886+00
rnLMofkq4	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:25:34.814741+00	2026-11-17 08:25:42.306192+00
5uVG2zVrF	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:25:44.282206+00	2026-11-17 08:25:47.389411+00
bDd14RgYO	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:25:43.024726+00	2026-11-17 08:25:47.425451+00
Hklgmnney	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:25:48.064678+00	2026-11-17 08:26:07.902692+00
b0gxmZE3O	HEHE	#3B8282	25	1365	2026-11-17 08:25:48.212984+00	2026-11-17 08:26:08.446103+00
ppezr-P6D	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:26:08.423403+00	2026-11-17 08:26:20.642671+00
R1aO2jL5d	HEHE	#3B8282	25	1365	2026-11-17 08:26:09.175964+00	2026-11-17 08:26:21.480377+00
YnTzpnG3f	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:26:21.169099+00	2026-11-17 08:26:25.799604+00
eVGchdEpN	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:26:24.970296+00	2026-11-17 08:26:25.933701+00
16Iiq4ICb	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:26:26.442741+00	2026-11-17 08:26:31.980072+00
RL4hlwi_o	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:26:28.241776+00	2026-11-17 08:26:32.273346+00
0RAOo0tz4	HEHE	#3B8282	25	1365	2026-11-17 08:26:26.970427+00	2026-11-17 08:26:32.446082+00
5oWEMHgkB	Dauss	#3B8282	1051.479064428624	897.3292360821533	2026-11-17 08:26:32.552926+00	2026-11-17 08:26:44.95408+00
kZ05JLVht	HEHE	#3B8282	25	1365	2026-11-17 08:26:32.958914+00	2026-11-17 08:26:45.442226+00
HmEQ5qyBT	Dauss	#3B8282	1051.479064428624	881.7292360821533	2026-11-17 08:26:48.210988+00	2026-11-17 08:27:10.483285+00
zVtyZbQaI	Admin	#3B8282	446.6555248554693	1290.1981416780056	2026-11-17 11:24:56.498021+00	2026-11-17 11:30:21.202953+00
5FoNGre2e	HEHE	#3B8282	25	1365	2026-11-17 07:38:54.004787+00	2026-11-17 07:40:40.475099+00
42El4815K	Dauss	#3B8282	885.4855310266294	1335.0791229144138	2026-11-17 07:37:14.579807+00	2026-11-17 07:40:40.484693+00
1RsXsonL2	Dauss	#3B8282	885.4855310266294	1335.0791229144138	2026-11-17 07:40:40.787051+00	2026-11-17 07:40:42.281249+00
zdgGgDpha	HEHE	#3B8282	25	1365	2026-11-17 07:40:41.105516+00	2026-11-17 07:40:42.464904+00
ZK7Irly4e	Dauss	#3B8282	885.4855310266294	1335.0791229144138	2026-11-17 07:40:42.958105+00	2026-11-17 07:40:43.018983+00
_ibK2PI15	Dauss	#3B8282	1051.479064428624	881.7292360821533	2026-11-17 08:27:10.781327+00	2026-11-17 08:27:17.318024+00
Nwlo4ipx3	HEHE	#3B8282	25	1365	2026-11-17 08:27:11.247785+00	2026-11-17 08:27:17.517603+00
g-kym4IaE	Dauss	#3B8282	1051.479064428624	881.7292360821533	2026-11-17 08:27:13.235315+00	2026-11-17 08:27:17.629742+00
Q602D0_DN	Dauss	#3B8282	1051.479064428624	881.7292360821533	2026-11-17 08:27:17.734405+00	2026-11-17 08:27:21.133402+00
Pxk59pwjM	Dauss	#3B8282	1051.479064428624	881.7292360821533	2026-11-17 08:27:20.697667+00	2026-11-17 08:27:21.544917+00
kKJCixi5p	Dauss	#3B8282	1051.479064428624	881.7292360821533	2026-11-17 08:27:21.726545+00	2026-11-17 08:27:25.853409+00
eEGXRvXIS	HEHE	#3B8282	25	1365	2026-11-17 08:27:22.241277+00	2026-11-17 08:27:26.470486+00
UmOdvk5UD	HEHE	#3B8282	25	1365	2026-11-17 08:27:27.125799+00	2026-11-17 08:27:30.521051+00
Lnd6tb0E2	Dauss	#3B8282	1054.321202353528	924.319560002351	2026-11-17 11:32:49.635172+00	2026-11-17 11:33:58.068217+00
LpVGx_cMK	Dauss	#3B8282	512.2707744592278	1143.170778873851	2026-11-17 15:18:17.362245+00	2026-11-17 15:18:27.885563+00
IZBLNHrbx	Dauss	#3B8282	1051.479064428624	881.7292360821533	2026-11-17 08:27:30.610258+00	2026-11-17 08:27:47.110468+00
-yXLCm82H	Dauss	#3B8282	1055.8210644286241	881.7292360821533	2026-11-17 08:27:34.583518+00	2026-11-17 08:27:47.329844+00
bNdoE960P	Dauss	#3B8282	798.000561648717	1052.473527189968	2026-11-17 09:23:12.874435+00	2026-11-17 09:51:45.557596+00
D854o69iP	Dauss	#3B8282	885.4855310266294	1335.0791229144138	2026-11-17 07:40:42.702697+00	2026-11-17 07:41:41.403489+00
heXX6MEfD	Dauss	#3B8282	839.0794894739956	1353.3952230180469	2026-11-17 07:40:44.878166+00	2026-11-17 07:41:41.605544+00
HIkRUhfqr	HEHE	#3B8282	25	1365	2026-11-17 07:40:43.125933+00	2026-11-17 07:41:42.501726+00
wQGGT7ITp	Dauss	#3B8282	1055.8210644286241	881.7292360821533	2026-11-17 08:27:47.655706+00	2026-11-17 08:28:03.827712+00
6Rf3ZZWf-	Dauss	#3B8282	839.0794894739956	1353.3952230180469	2026-11-17 07:41:41.87028+00	2026-11-17 07:41:43.990126+00
BTYywvj4x	HEHE	#3B8282	25	1365	2026-11-17 07:41:42.969488+00	2026-11-17 07:41:44.39629+00
rKKvV8dhb	HEHE	#3B8282	25	1365	2026-11-17 08:27:48.003362+00	2026-11-17 08:28:04.440055+00
makf_hcoA	HEHE	#3B8282	25	1365	2026-11-17 07:41:44.937261+00	2026-11-17 07:54:16.453701+00
gGpsrJRg6	HEHE	#3B8282	25	1365	2026-11-17 07:54:17.950631+00	2026-11-17 07:54:18.47217+00
MAbwDp32i	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:54:18.831311+00	2026-11-17 07:54:37.250532+00
DeNeziTBc	HEHE	#3B8282	25	1365	2026-11-17 07:54:19.175188+00	2026-11-17 07:54:37.750968+00
Hvr-NcGYR	HEHE	#3B8282	25	1365	2026-11-17 07:55:12.371048+00	2026-11-17 07:55:35.566417+00
79LoXtFy8	Dauss	#3B8282	839.0794894739956	1353.3952230180469	2026-11-17 07:41:49.11584+00	2026-11-17 07:42:21.416594+00
B4DgiJo_v	HEHE	#3B8282	25	1365	2026-11-17 07:55:38.556728+00	2026-11-17 07:55:51.460139+00
L3dPVNgbo	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:56:09.287619+00	2026-11-17 07:56:09.815763+00
wojcor7B6	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:56:10.410268+00	2026-11-17 07:56:11.919747+00
v08-JqFhe	HEHE	#3B8282	25	1365	2026-11-17 07:56:12.92505+00	2026-11-17 07:56:21.41858+00
nNJBLB5qz	Dauss	#3B8282	1060.719123916902	832.4891239169043	2026-11-17 07:42:21.742658+00	2026-11-17 07:42:43.096334+00
lVECjhy13	HEHE	#3B8282	25	1365	2026-11-17 07:56:24.06171+00	2026-11-17 07:56:24.667332+00
96eR7G1Mk	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:56:21.630068+00	2026-11-17 07:56:24.978953+00
kbMSrHaH4	HEHE	#3B8282	25	1365	2026-11-17 07:56:25.404986+00	2026-11-17 07:56:26.411782+00
pIAThCo3K	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:56:26.496567+00	2026-11-17 07:56:38.759164+00
v7QMxkmLt	Dauss	#3B8282	1123.7787481158068	881.0829887746221	2026-11-17 07:57:24.093577+00	2026-11-17 07:57:30.056276+00
crBe7ZdPf	Dauss	#3B8282	120.00400000000003	1365	2026-11-17 08:02:25.291049+00	2026-11-17 08:02:30.114076+00
3h0WWGalH	Dauss	#3B8282	1225	915	2026-11-17 08:03:50.680817+00	2026-11-17 08:03:51.061335+00
NJrUTDyOy	melon	#3B8282	692.1496358081068	948.8435631555385	2026-11-17 15:24:05.463129+00	2026-11-17 15:28:18.605138+00
lg1ywHpKQ	HEHE	#3B8282	25	1365	2026-11-17 08:28:05.043334+00	2026-11-17 08:32:05.578767+00
YwH8eULIm	melon	#3B8282	25	1365	2026-11-17 15:31:58.040052+00	2026-11-17 15:32:04.415984+00
3eRxWMscO	Dauss	#3B8282	1046.9215675445287	907.3364245119602	2026-11-18 02:58:36.057976+00	2026-11-18 02:58:39.753244+00
os1PTtcUv	Dauss	#3B8282	1104.5148947698349	1609.9488790881924	2026-11-22 11:35:29.242372+00	2026-11-22 11:35:53.618403+00
Pzw7QWC6q	Dauss	#3B8282	353.7570449501538	1366.5720965237251	2026-11-21 08:43:20.589833+00	2026-11-21 08:44:00.632989+00
u00o3uakE	Dauss	#3B8282	604.4782851280999	1235.475863897204	2026-11-18 09:06:21.088276+00	2026-11-18 09:06:45.24184+00
jfnMr2ePx	Admin	#3B8282	1060.0402221397308	864.0324510873284	2026-11-18 03:58:12.483306+00	2026-11-18 03:58:43.073314+00
SJM6knuAO	melon	#3B8282	939.6565851520304	869.9551735979993	2026-11-18 07:04:47.711727+00	2026-11-18 07:05:27.665532+00
0nkYqrQFa	Dauss	#3B8282	537.7774426410506	1301.515738832828	2026-11-21 12:18:22.292831+00	2026-11-21 12:18:39.923258+00
ACv0i-lh6	melon	#3B8282	1051.1419752227466	1316.7911667131832	2026-11-18 07:08:20.05021+00	2026-11-18 07:08:55.071145+00
6gGuxZH9Q	Dauss	#3B8282	174.21324396383542	1331.6047217064513	2026-11-21 06:04:43.293314+00	2026-11-21 06:05:58.033213+00
MXOJ26Ali	Admin	#3B8282	1180.521342975635	1508.071782975636	2026-11-21 06:18:17.239479+00	2026-11-21 06:18:21.371175+00
7bHD7r8I4	Dauss	#3B8282	1190.1446869168844	1598.1360488649216	2026-11-22 11:47:54.646166+00	2026-11-22 11:48:38.219837+00
-b73iA4Dl	Admin	#3B8282	1931.9068382153491	328.5353318161433	2026-11-21 14:50:35.542922+00	2026-11-21 14:53:11.770881+00
9MRTNyH4W	Dauss	#3B8282	176.26021775970986	1159.6423888703064	2026-11-18 04:49:58.421563+00	2026-11-18 05:06:28.819723+00
M1b04J9yy	Dauss	#3B8282	1171.5055160440838	845.4523450319076	2026-11-17 08:42:14.69533+00	2026-11-17 08:50:22.39643+00
csSZeChWz	Dauss	#3B8282	1055.8210644286241	881.7292360821533	2026-11-17 08:56:56.372327+00	2026-11-17 08:57:02.324857+00
0KbhRwSlm	Admin	#3B8282	1057.6488585683728	1002.7135951666611	2026-11-18 04:57:50.106517+00	2026-11-18 05:07:00.86622+00
XlXf9oUlF	Dauss	#3B8282	1055.8210644286241	881.7292360821533	2026-11-17 09:19:11.501452+00	2026-11-17 09:19:16.456348+00
7pMaomzrl	Dauss	#3B8282	892.7056733354005	1385.2018902504765	2026-11-22 09:29:06.413308+00	2026-11-22 09:30:11.295844+00
jl3Yr7bGv	Dauss	#3B8282	328.88026863638584	1339.100704644811	2026-11-20 08:19:36.655713+00	2026-11-20 08:46:18.857199+00
YTAbcKW4s	Dauss	#3B8282	1161.7455762755008	869.0564439991855	2026-11-19 05:54:53.869082+00	2026-11-19 05:59:23.949616+00
Sf6TpV6On	Dauss	#3B8282	1225	1715	2026-11-20 08:59:31.151994+00	2026-11-20 08:59:53.747686+00
qpNHVlF36	Dauss	#3B8282	169.6133609588915	1319.940639041108	2026-11-20 09:22:00.947386+00	2026-11-20 09:22:13.387694+00
PObXyw74l	Dauss	#3B8282	1169.2293950772728	1696.5450931776356	2026-11-20 12:21:56.144062+00	2026-11-20 12:22:06.963685+00
987ODaKHp	Admin	#3B8282	1063.8536474151874	1173.5168447843753	2026-11-19 10:07:30.609201+00	2026-11-19 10:14:03.445759+00
OFUtDyBkY	Dauss	#3B8282	1047.7801722461709	878.2306435524304	2026-11-17 08:28:07.59847+00	2026-11-17 08:39:36.774985+00
IgIk9GXPN	HEHE	#3B8282	25	1365	2026-11-17 08:36:07.290155+00	2026-11-17 08:39:36.783537+00
KmNPWpMms	Dauss	#3B8282	1055.8210644286241	881.7292360821533	2026-11-17 08:28:04.438659+00	2026-11-17 08:39:36.784417+00
Wwv2Wkr07	Dauss	#3B8282	580.0957236825865	1271.9745591386618	2026-11-20 12:22:07.170519+00	2026-11-20 12:23:20.71019+00
VwDE4lROl	Dauss	#3B8282	1052.0479999999982	915	2026-11-20 12:25:10.283658+00	2026-11-20 12:25:30.708932+00
-qnD5NSQt	Dauss	#3B8282	1052.0479999999982	915	2026-11-21 05:42:08.902572+00	2026-11-21 05:42:14.109849+00
T2jksvS3P	Dauss	#3B8282	389.9366237719994	822.6763970821448	2026-11-18 05:45:19.280699+00	2026-11-18 05:45:23.336523+00
P5hB5l4JX	Dauss	#3B8282	1055.8210644286241	881.7292360821533	2026-11-17 08:41:50.27476+00	2026-11-17 08:42:06.383673+00
mgt9Jjsy-	Admin	#3B8282	864.052606623176	914.9499146664912	2026-11-20 01:20:54.100986+00	2026-11-20 01:21:58.530076+00
WpBI0j3MI	Admin	#3B8282	363.80599906401227	1275.07425672708	2026-11-21 06:18:21.571659+00	2026-11-21 06:23:53.792612+00
KquKX9pJy	Dauss	#3B8282	151.4857341471667	1307.5106286924333	2026-11-21 05:54:15.405067+00	2026-11-21 05:54:58.350674+00
OxKTqR6Il	Admin	#3B8282	1073.5552270173812	983.1433832198193	2026-11-19 08:23:12.06353+00	2026-11-19 08:48:14.085507+00
sHHO__bLn	Dauss	#3B8282	656.0363677039908	1226.7084829473724	2026-11-18 05:47:10.308806+00	2026-11-18 05:47:37.37926+00
n-lBKRhe5	ANG	#3B8282	499.7426986613836	1063.5136665422738	2026-11-20 01:36:33.279824+00	2026-11-20 02:27:09.339066+00
BIM3U0_3a	Admin	#3B8282	133.38776000000004	1365	2026-11-20 02:36:16.31393+00	2026-11-20 02:36:20.541413+00
wXvfrBbWI	Admin	#3B8282	1189.2680488778483	859.7344930546914	2026-11-21 07:04:25.824587+00	2026-11-21 07:04:48.937225+00
kdZYu7-mx	Dauss	#3B8282	1025.1670696320605	1277.1119663804147	2026-11-20 03:20:29.170088+00	2026-11-20 03:22:20.86285+00
t7z7Iy_qh	HEHE	#3B8282	458.51195737293034	1278.0315139205732	2026-11-19 08:05:31.791812+00	2026-11-19 08:13:58.412402+00
B_0VVoJpW	Admin	#3B8282	1199.8468880912894	1653.7966765372032	2026-11-21 06:28:35.068635+00	2026-11-21 06:33:10.533821+00
pU3CfowWx	Dauss	#3B8282	1225	1654.3679999999993	2026-11-21 06:41:52.512191+00	2026-11-21 06:41:54.804311+00
Sj5k2SSVL	Admin	#3B8282	786.1510955280328	1275.9704360073201	2026-11-18 09:07:24.742666+00	2026-11-18 09:25:06.679373+00
BdKG7pFwW	Dauss	#3B8282	1191.9950013909363	1185.4778264127144	2026-11-20 04:55:24.138947+00	2026-11-20 04:56:29.548768+00
4rpTEKBhn	Admin	#3B8282	1627.2619075958296	1121.5561344860707	2026-11-18 09:31:38.803803+00	2026-11-18 09:31:54.016314+00
W4Gv6bgYS	Admin	#3B8282	1177.4810011603772	1601.4704589516339	2026-11-22 09:47:28.141383+00	2026-11-22 10:11:27.111169+00
vJWYzENM2	Dauss	#3B8282	201.06086019985733	1361.979007811358	2026-11-21 06:41:55.028029+00	2026-11-21 06:43:01.808327+00
uMqOiIByl	Dauss	#3B8282	1247.3154269978525	441.03440163183245	2026-11-20 06:48:06.020898+00	2026-11-20 06:49:16.690385+00
qWKgXjV02	Admin	#3B8282	1209.5037673108911	1221.3734287145944	2026-11-22 10:19:27.369067+00	2026-11-22 10:20:23.336668+00
zDsGLSqs6	Dauss	#3B8282	263.79422451793846	1256.2161754821188	2026-11-18 03:58:59.415204+00	2026-11-18 04:14:52.873709+00
TLKzkybWp	Admin	#3B8282	1182.1221464683176	1551.4288495571725	2026-11-22 11:17:32.591753+00	2026-11-22 11:17:40.68487+00
UFsuGWbwJ	Dauss	#3B8282	843.7226996884142	1168.366090138893	2026-11-20 07:54:29.263813+00	2026-11-20 07:55:49.760576+00
bE0-koDER	Superadmin	#3B8282	1225	915	2026-11-20 08:02:13.642033+00	2026-11-20 08:02:13.655101+00
o_acVDDOv	Admin	#3B8282	1050.2204339258228	1064.1165698086381	2026-11-19 08:49:02.863394+00	2026-11-19 08:55:53.192502+00
D8WNNMrXa	Dauss	#3B8282	263.79422451793846	1256.2161754821188	2026-11-18 04:46:51.099884+00	2026-11-18 04:49:08.428195+00
dhUVaFJpM	Dauss	#3B8282	356.3578986844816	1229.8696470953657	2026-11-18 04:50:05.864336+00	2026-11-18 04:50:12.378111+00
PSAeA-89l	Admin	#3B8282	1225	915	2026-11-18 09:43:01.203749+00	2026-11-18 09:43:04.787343+00
H9153U6Xz	Dauss	#3B8282	228.03320003534986	1329.1745933346915	2026-11-21 06:53:28.145811+00	2026-11-21 07:12:11.732717+00
CqN2NDlJh	HEHE	#3B8282	183.63152470699183	621.6378925878827	2026-11-18 09:37:26.601751+00	2026-11-18 10:44:35.581909+00
EW406tYJV	Admin	#3B8282	984.6373070173801	920.3190632198178	2026-11-19 02:45:22.808041+00	2026-11-19 03:10:05.417873+00
mryz8X-l7	Dauss	#3B8282	1062.0435271899682	1089.2424136758104	2026-11-19 03:16:53.930992+00	2026-11-19 03:16:59.955924+00
yw9V8wzhj	Admin	#3B8282	483.52133647398216	1299.5366538959347	2026-11-18 09:43:16.697328+00	2026-11-18 09:44:31.231321+00
_2-LtgSkF	Admin	#3B8282	1055.023665443212	1039.9090182912478	2026-11-19 09:09:00.763606+00	2026-11-19 09:16:11.323136+00
ArMfURs62	Dauss	#3B8282	463.51125695367125	619.4055963166894	2026-11-21 07:51:37.88987+00	2026-11-21 07:55:32.593968+00
Va1TYYkv0	Dauss	#3B8282	609.3839030012881	1298.9764833191493	2026-11-18 09:07:14.197333+00	2026-11-18 09:07:18.10466+00
wrXLPGCKM	Dauss	#3B8282	380.56590838669933	568.2777818786079	2026-11-18 09:13:27.456587+00	2026-11-18 09:13:41.469398+00
k9eNMjz4l	Dauss	#3B8282	1065.0149754646397	876.7454014468897	2026-11-17 10:56:24.042747+00	2026-11-17 10:57:04.221039+00
Vn4Xi1c3j	Dauss	#3B8282	986.9350012870702	844.122174767238	2026-11-20 08:46:19.082298+00	2026-11-20 08:46:48.440739+00
daIo6oMud	melon	#3B8282	1027.7370006588565	625.1877165732159	2026-11-18 07:06:46.91083+00	2026-11-18 07:07:39.825444+00
XyvkXi6jD	melon	#3B8282	1206.046907618577	336.89664434864477	2026-11-18 07:08:55.132361+00	2026-11-18 07:09:18.163766+00
TJ6_Readh	Dauss	#3B8282	1219.2149237208525	1684.1769237208525	2026-11-20 09:01:54.777685+00	2026-11-20 09:03:09.547357+00
Xq8PLxREx	Dauss	#3B8282	1015.5477581941925	929.0869603984657	2026-11-17 11:30:27.877571+00	2026-11-17 11:32:11.430628+00
Iux3EvUQt	Admin	#3B8282	1021.8616900472757	789.4964998722721	2026-11-21 14:40:35.673491+00	2026-11-21 14:44:52.271465+00
lBuODKuRb	Dauss	#3B8282	1099.6428811775434	923.1927451082449	2026-11-17 11:41:52.454191+00	2026-11-17 11:42:11.021622+00
zWHpRuB-W	Dauss	#3B8282	318.6600320132107	1077.5820304375138	2026-11-19 03:42:39.209861+00	2026-11-19 03:42:53.0689+00
oXPlKj8HO	Dauss	#3B8282	1105.842	915	2026-11-21 07:36:59.588327+00	2026-11-21 07:39:18.970973+00
V-JiC7ATT	Dauss	#3B8282	1055.8210644286241	881.7292360821533	2026-11-17 08:41:32.190224+00	2026-11-17 08:50:22.396378+00
hmyp-nN_M	Dauss	#3B8282	1055.8210644286241	881.7292360821533	2026-11-17 08:57:17.296962+00	2026-11-17 08:57:17.296962+00
Q2ZixJ3KG	Dauss	#3B8282	1055.8210644286241	881.7292360821533	2026-11-17 09:19:17.800877+00	2026-11-17 09:19:22.602882+00
5UxDKDe00	Dauss	#3B8282	552.9542883873681	905.8592944170534	2026-11-21 07:55:35.562272+00	2026-11-21 07:55:50.251101+00
lQZ2hOi_O	Dauss	#3B8282	582.5287022742342	1013.603895624856	2026-11-21 08:16:49.683419+00	2026-11-21 08:16:57.736424+00
JGeVdu8c1	Dauss	#3B8282	259.2225251597619	1354.7198969704789	2026-11-21 08:20:57.657849+00	2026-11-21 08:42:53.322909+00
iZtrTrJah	Admin	#3B8282	1385.018440054546	662.9060945068555	2026-11-21 07:04:49.096755+00	2026-11-21 07:08:29.185172+00
ppa1SfOet	Admin	#3B8282	1166.1769492251897	1410.7707602655807	2026-11-21 14:54:52.62066+00	2026-11-21 14:56:09.167515+00
EKqRjS9mS	Dauss	#3B8282	353.7570449501538	1366.5720965237251	2026-11-21 09:13:47.768858+00	2026-11-21 09:13:55.560196+00
Ok6JfD3kT	Dauss	#3B8282	1152.69067315949	1409.236673159487	2026-11-22 09:30:11.401791+00	2026-11-22 09:30:14.919046+00
ipZv7AnO6	Dauss	#3B8282	1149.3415878635358	951.1601330856598	2026-11-17 15:18:27.938189+00	2026-11-17 15:20:33.051511+00
rQFcPoywr	Admin	#3B8282	1209.5037673108911	1221.3734287145944	2026-11-22 10:17:35.774454+00	2026-11-22 10:17:40.896039+00
oUN-8XUu7	Admin	#3B8282	1118.8343375509019	1604.195922307055	2026-11-22 11:17:40.751544+00	2026-11-22 11:29:10.646787+00
ndTn1T9t3	Admin	#3B8282	241.9905790068216	1354.6467693615664	2026-11-21 05:53:59.766081+00	2026-11-21 06:04:17.59488+00
8Ot4L1EKJ	Dauss	#3B8282	1104.5148947698349	1609.9488790881924	2026-11-22 11:36:14.850962+00	2026-11-22 11:36:24.74586+00
cFb8hZrxC	Dauss	#3B8282	1209.3795844844205	1344.444078288616	2026-11-21 06:05:58.287192+00	2026-11-21 06:06:24.781789+00
gNdoRDc9y	Dauss	#3B8282	1104.5089473335515	1598.1360488649216	2026-11-22 11:56:10.67374+00	2026-11-22 11:56:27.400646+00
8KLdR8xfi	Admin	#3B8282	963.5083539258219	1077.0744498086383	2026-11-19 08:55:54.261878+00	2026-11-19 09:04:06.59085+00
NZjQnYLg_	Dauss	#3B8282	498.5437756947658	769.8763758226776	2026-11-17 15:24:26.517508+00	2026-11-17 15:28:19.894208+00
6hq_52Bpz	Dauss	#3B8282	1234.2107729317363	1660.2092270682645	2026-11-20 09:22:13.497821+00	2026-11-20 09:29:06.276496+00
66lLpZUYN	Dauss	#3B8282	1457.4111934276157	518.1061319622054	2026-11-17 15:28:19.963899+00	2026-11-17 15:35:13.367638+00
zb_bIxW7M	melon	#3B8282	1158.610076127199	898.3947162830096	2026-11-17 15:32:04.509487+00	2026-11-17 15:35:15.929485+00
35Zlv5RPv	Dauss	#3B8282	1037.5621863552708	972.6458136447263	2026-11-20 12:23:20.815807+00	2026-11-20 12:23:45.545109+00
gANlX-IcV	Admin	#3B8282	1038.6995644664853	899.382258141033	2026-11-18 09:31:54.104075+00	2026-11-18 09:41:44.346177+00
9smh0ITez	Dauss	#3B8282	1325.3312235280475	1109.7843110908134	2026-11-20 12:24:26.049008+00	2026-11-20 12:25:10.196454+00
Ar3GQ87oD	melon	#3B8282	1111.5123878281843	888.7711641390385	2026-11-21 03:45:50.182909+00	2026-11-21 03:46:19.900429+00
65MqCKAc2	Admin	#3B8282	1513.2445147483038	1167.187145733451	2026-11-18 09:41:44.436973+00	2026-11-18 09:43:01.122481+00
Ay7VCLS0b	Dauss	#3B8282	134.96166961675652	1307.514199722029	2026-11-21 05:42:14.334228+00	2026-11-21 05:42:44.973895+00
vlBoLjc74	Admin	#3B8282	1050.236519758617	1052.8812776590776	2026-11-19 10:19:06.126627+00	2026-11-19 10:30:33.113614+00
f7BNnKFgI	Admin	#3B8282	689.3155196113681	805.8992532377425	2026-11-18 09:43:04.856849+00	2026-11-18 09:43:16.628915+00
WN50SmA4k	Admin	#3B8282	1209.5037673108911	1221.3734287145944	2026-11-22 10:22:12.62078+00	2026-11-22 10:29:35.286241+00
POA6N_wFc	Dauss	#3B8282	830.2532925547221	431.12255003132674	2026-11-21 12:18:39.970867+00	2026-11-21 12:26:39.459021+00
4CSHUa3ad	Admin	#3B8282	743.1429067968627	457.584115839403	2026-11-21 12:39:24.934222+00	2026-11-21 13:03:03.945366+00
UwLt3zib0	Admin	#3B8282	185.41983596661493	749.591824406487	2026-11-18 09:44:32.010733+00	2026-11-18 09:47:26.231422+00
35i_tHIDv	Admin	#3B8282	1598.6885079818576	1128.7167765118118	2026-11-18 09:47:26.355828+00	2026-11-18 09:48:34.230474+00
XW6i00icj	Admin	#3B8282	447.5103999999985	915	2026-11-18 09:48:34.321122+00	2026-11-18 09:48:45.262018+00
AmC3AjTxL	Dauss	#3B8282	151.3525798182341	1356.119342612628	2026-11-21 06:06:24.929301+00	2026-11-21 06:14:28.559591+00
SvEJQTntM	Admin	#3B8282	363.40036200329973	1324.7389692872182	2026-11-21 06:23:55.744877+00	2026-11-21 06:24:02.143027+00
bK_O4rm_i	Admin	#3B8282	1212.9567596265297	1593.7417522382925	2026-11-21 06:39:06.236567+00	2026-11-21 06:39:16.649994+00
Gg23_Omjn	Dauss	#3B8282	214.97333333333344	1365	2026-11-21 06:39:46.683747+00	2026-11-21 06:40:01.924883+00
dwK2y_HEa	Dauss	#3B8282	1408.1133521805884	1057.274783781654	2026-11-18 09:49:11.922724+00	2026-11-18 09:49:24.005333+00
3LBDLRzor	Dauss	#3B8282	318.6600320132107	1077.5820304375138	2026-11-19 04:00:33.946068+00	2026-11-19 04:00:36.80877+00
5_6fuonWZ	Dauss	#3B8282	1156.0999999999997	915	2026-11-21 07:12:12.026105+00	2026-11-21 07:33:19.396421+00
H5Lv-IjQx	Dauss	#3B8282	318.6600320132107	1220.8333637708454	2026-11-19 04:00:40.358892+00	2026-11-19 04:00:48.62333+00
68lHDQF3M	Admin	#3B8282	294.54790505220257	1332.1604511021103	2026-11-21 06:44:29.757234+00	2026-11-21 06:49:16.402866+00
g3T2JgQnL	Dauss	#3B8282	1185.974	910.658	2026-11-19 04:00:48.731703+00	2026-11-19 04:02:02.78964+00
UiDcEoMBf	Admin	#3B8282	537.6074269347697	873.6215704572996	2026-11-18 05:07:00.961596+00	2026-11-18 05:32:32.158589+00
XuwRZXKKs	Dauss	#3B8282	403.2472018210549	786.6289823228303	2026-11-18 05:43:06.969583+00	2026-11-18 05:43:33.741597+00
bh20WQVYa	Dauss	#3B8282	1062.0435271899682	948.3397470091429	2026-11-18 09:49:24.112817+00	2026-11-18 09:51:54.56373+00
MKgYuMSq9	Dauss	#3B8282	389.9366237719994	822.6763970821448	2026-11-18 05:45:33.638545+00	2026-11-18 05:45:45.029533+00
nQKFbmSuA	Dauss	#3B8282	508.92062942873997	889.5080173966417	2026-11-18 06:55:02.11438+00	2026-11-18 06:55:13.251842+00
gAAE4V_fq	Dauss	#3B8282	1202.2107898273077	889.3592034144643	2026-11-18 06:55:13.35388+00	2026-11-18 06:55:17.080305+00
cbBmL7qkA	Dauss	#3B8282	501.13788379532343	1159.164951716231	2026-11-18 06:56:24.317295+00	2026-11-18 06:56:36.317152+00
4NuGqRPM5	nooogel	#3B8282	618.8059402136487	1312.9508597863526	2026-11-19 09:44:28.595608+00	2026-11-19 09:44:41.540774+00
H00HYJ2Xp	Admin	#3B8282	311.14092945048304	1193.55634205406	2026-11-21 14:56:09.240126+00	2026-11-21 14:56:14.589107+00
hnipkyS-4	Dauss	#3B8282	969.6006165107609	1018.3888881488597	2026-11-20 08:50:59.072358+00	2026-11-20 08:51:35.453234+00
WxyAPUQP5	Dauss	#3B8282	1104.5148947698349	1609.9488790881924	2026-11-22 11:41:33.645036+00	2026-11-22 11:41:59.350155+00
0q02dRK4j	Dauss	#3B8282	1225	1715	2026-11-20 09:03:49.605444+00	2026-11-20 09:03:52.269415+00
xEKi0l6Ja	Dauss	#3B8282	1234.2107729317363	1660.2092270682645	2026-11-20 09:29:13.648724+00	2026-11-20 09:29:16.228985+00
PtkUltCcm	Dauss	#3B8282	170.93861538730877	1312.28655494156	2026-11-20 12:23:45.610677+00	2026-11-20 12:24:09.312711+00
NQR2zTXZx	Admin	#3B8282	1170.08751903827	203.44149431429793	2026-11-20 02:36:20.609674+00	2026-11-20 03:04:47.26994+00
b9v6h8_Fu	melon	#3B8282	303.97759124265065	1254.3042752846272	2026-11-21 03:46:20.02942+00	2026-11-21 03:46:26.394701+00
13y52NHb4	Admin	#3B8282	254.94353375860467	1334.7081906661929	2026-11-21 06:15:16.616346+00	2026-11-21 06:16:51.017788+00
siG8pBZLv	Admin	#3B8282	1177.3760308436674	1684.7715908436671	2026-11-21 06:24:02.347794+00	2026-11-21 06:24:14.650981+00
rfrvXERI-	Admin	#3B8282	294.8498059666839	1305.6899588305992	2026-11-21 07:32:03.43265+00	2026-11-21 07:36:26.405815+00
5mUpkZMip	Dauss	#3B8282	134.96166961675652	1307.514199722029	2026-11-21 05:50:10.828932+00	2026-11-21 05:51:01.98472+00
BYt8gxXh1	Dauss	#3B8282	990.293766009887	959.2652101726928	2026-11-21 07:48:35.054411+00	2026-11-21 07:51:06.466128+00
yfAkCL1ZJ	Dauss	#3B8282	1254.5387219177835	987.0209829408092	2026-11-21 07:55:50.509455+00	2026-11-21 07:56:04.350658+00
iDMCYoEVc	Dauss	#3B8282	1270.167353600635	803.0811370419633	2026-11-20 03:34:31.202428+00	2026-11-20 03:38:56.069613+00
ZWtPeqRQZ	Dauss	#3B8282	1191.9950013909363	1185.4778264127144	2026-11-20 06:33:03.69503+00	2026-11-20 06:33:07.63623+00
spdSfYIAF	Dauss	#3B8282	1233.975187484966	1580.222274614344	2026-11-20 06:56:35.546863+00	2026-11-20 06:56:46.944083+00
rLfxqCnSr	Dauss	#3B8282	1202.686533634088	1031.1260997722457	2026-11-21 08:16:57.996744+00	2026-11-21 08:17:23.28736+00
lUxg1Z-RK	Dauss	#3B8282	1221.929742356088	1411.0297423560855	2026-11-20 07:55:49.87235+00	2026-11-20 07:56:12.389425+00
3lu9B1sSk	Dauss	#3B8282	25	1365	2026-11-20 08:03:24.26354+00	2026-11-20 08:03:32.840575+00
ICZ84L8VX	Admin	#3B8282	81.37267999999983	1365	2026-11-21 06:24:14.812272+00	2026-11-21 06:28:28.348032+00
-YmAG8cZk	Admin	#3B8282	184.46705294478295	1320.9604634882837	2026-11-21 05:49:49.565924+00	2026-11-21 05:53:57.557602+00
-PD64KC91	Admin	#3B8282	339.75233627485176	1306.8840709478748	2026-11-21 06:49:18.616062+00	2026-11-21 07:04:19.835492+00
oWQcBPcIX	ANG	#3B8282	183.63152470699183	621.6378925878827	2026-11-19 10:22:09.095183+00	2026-11-19 10:34:00.378675+00
RYUXdQvPI	Admin	#3B8282	152.4283194029237	1342.1334767513858	2026-11-21 06:39:16.838688+00	2026-11-21 06:44:28.266394+00
qfhBtJzKz	Admin	#3B8282	1164.0640873144305	1624.747153732153	2026-11-21 07:08:29.413089+00	2026-11-21 07:10:07.060947+00
4_U-x2wYq	melon	#3B8282	303.97759124265065	1254.3042752846272	2026-11-21 08:21:29.597714+00	2026-11-21 08:31:54.034784+00
Uii3SQHnR	Admin	#3B8282	1019.6775092520859	1396.4989765194416	2026-11-22 08:52:57.689301+00	2026-11-22 09:13:04.329662+00
rMryGP6Vy	Dauss	#3B8282	1048.758042654542	1187.3940252549835	2026-11-22 09:30:14.970233+00	2026-11-22 09:30:24.383733+00
yPOhUjzg9	Admin	#3B8282	410.3016009665716	1264.0178438307137	2026-11-21 11:39:08.65479+00	2026-11-21 12:01:22.712809+00
6_6_umUm7	Dauss	#3B8282	515.3444133275736	985.8770005345538	2026-11-21 12:38:18.331125+00	2026-11-21 12:38:33.218346+00
e0_euAQRc	Admin	#3B8282	1209.5037673108911	1221.3734287145944	2026-11-22 10:17:42.553763+00	2026-11-22 10:19:25.872731+00
sMERPYwJR	melon	#3B8282	303.97759124265065	1254.3042752846272	2026-11-22 10:24:40.956934+00	2026-11-22 10:24:51.702253+00
kZORJJhDT	Admin	#3B8282	1831.8161701636116	285.3316372871379	2026-11-21 13:06:22.54638+00	2026-11-21 13:11:02.4187+00
WRRNIn5uf	Dauss	#3B8282	1178.0967455715834	908.1251865188933	2026-11-21 07:51:21.792539+00	2026-11-21 07:51:37.680614+00
VUlSauEoB	Dauss	#3B8282	1094.1080728455186	332.1487100346678	2026-11-20 03:07:05.82774+00	2026-11-20 03:07:34.099329+00
pNvRZPE6r	Dauss	#3B8282	1104.5148947698349	1609.9488790881924	2026-11-22 11:43:50.13186+00	2026-11-22 11:44:16.681319+00
A9Gtvhg8H	Admin	#3B8282	1209.5037673108911	1185.192348714594	2026-11-21 14:56:14.621285+00	2026-11-21 14:57:09.830041+00
nCKRz4deV	Dauss	#3B8282	741.8085268148482	564.0057746753301	2026-11-20 03:43:14.917914+00	2026-11-20 03:44:19.884429+00
RCabYeLoR	Dauss	#3B8282	893.5024974375641	1421.0922673787668	2026-11-20 06:33:07.749116+00	2026-11-20 06:33:29.252146+00
duRxEzplv	Dauss	#3B8282	871.2998641546895	1140.7889256726173	2026-11-20 06:56:47.044139+00	2026-11-20 06:56:59.800537+00
caTauvmq_	Dauss	#3B8282	1211.3844575156422	1532.1290271965313	2026-11-20 07:56:12.483189+00	2026-11-20 07:56:24.316116+00
ROf2sboCa	Dauss	#3B8282	1225	858.736	2026-11-20 07:56:24.425642+00	2026-11-20 07:56:33.726772+00
2l5ViPWg6	melon	#3B8282	303.97759124265065	1254.3042752846272	2026-11-21 08:34:14.978674+00	2026-11-21 08:43:13.767777+00
5LPrHD5pd	Dauss	#3B8282	164.1173333333333	1365	2026-11-20 08:05:40.997594+00	2026-11-20 08:18:42.430552+00
g5bO924KB	Dauss	#3B8282	1030.1298695946475	1032.6554745660794	2026-11-20 08:59:23.503574+00	2026-11-20 08:59:31.058173+00
9FmraIbBu	Dauss	#3B8282	1228.989611844575	1568.628781140655	2026-11-20 09:21:26.272735+00	2026-11-20 09:22:00.82009+00
p_BklBn_c	ANG	#3B8282	657.4323786456863	1219.523878880489	2026-11-19 09:35:54.04026+00	2026-11-19 09:48:46.659158+00
opm7o36Ut	Admin	#3B8282	1099.6506565080729	1109.2843826071332	2026-11-19 09:16:12.552375+00	2026-11-19 09:48:47.074292+00
mrnqluz9v	Dauss	#3B8282	111.06000000000002	1365	2026-11-21 06:15:19.904885+00	2026-11-21 06:24:19.740644+00
aOGnuK9TJ	Admin	#3B8282	329.53016596668385	1305.6899588305992	2026-11-21 07:36:28.58913+00	2026-11-21 08:01:22.894865+00
I_0X8Uo1o	Dauss	#3B8282	571.6534372278273	894.7738273379296	2026-11-21 07:56:04.569263+00	2026-11-21 08:02:25.402105+00
TuxQFrx4v	Admin	#3B8282	838.9982429043274	1204.4258969601021	2026-11-22 09:26:24.903239+00	2026-11-22 09:36:15.355269+00
wUXVDiBgj	Dauss	#3B8282	141.55800000000002	1365	2026-11-21 06:24:27.505724+00	2026-11-21 06:27:44.150393+00
U4j-CfDb_	Dauss	#3B8282	1225	1715	2026-11-21 06:40:02.173568+00	2026-11-21 06:40:04.837188+00
98YPy6LUW	Dauss	#3B8282	124.42400000000002	1365	2026-11-21 06:40:05.049721+00	2026-11-21 06:40:25.347797+00
Ni3WXw-6g	Dauss	#3B8282	168.30384365256145	1318.0749283143691	2026-11-21 12:01:30.656007+00	2026-11-21 12:10:53.244153+00
G4LgLov7-	Dauss	#3B8282	357.8155661381579	1259.2171898980052	2026-11-21 08:17:23.565509+00	2026-11-21 08:19:59.547818+00
WO8v3vWZr	Admin	#3B8282	419.37559116255517	1111.8628885771884	2026-11-21 12:38:53.342937+00	2026-11-21 12:39:24.87645+00
mIylJ8xKt	Admin	#3B8282	306.6099409632052	1277.3645468970772	2026-11-20 10:20:33.066141+00	2026-11-20 10:29:07.576385+00
iuDEdfE6H	Dauss	#3B8282	1247.3617439604436	1491.4951243481814	2026-11-20 12:24:09.395696+00	2026-11-20 12:24:25.978122+00
-Z2GGiRym	Admin	#3B8282	825.2483568151133	993.513401564349	2026-11-21 13:12:20.311849+00	2026-11-21 13:13:12.555725+00
8CK9dldNJ	Dauss	#3B8282	191.07513533198463	1343.9050623651726	2026-11-21 06:49:44.811852+00	2026-11-21 06:52:36.370323+00
sgSuF7dzj	ANG	#3B8282	183.63152470699183	621.6378925878827	2026-11-19 10:47:05.871153+00	2026-11-19 11:00:32.879591+00
vKQru1jzy	Admin	#3B8282	294.8498059666839	1305.6899588305992	2026-11-21 07:10:07.289604+00	2026-11-21 07:32:02.306078+00
2JRM37jtv	Dauss	#3B8282	1156.0999999999997	915	2026-11-21 07:33:44.729367+00	2026-11-21 07:34:00.721396+00
MC8uehOtb	Admin	#3B8282	195.2804529447829	1320.9604634882837	2026-11-21 05:37:43.957582+00	2026-11-21 05:49:35.839691+00
\.


--
-- Data for Name: rpg_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rpg_profiles (user_id, profile_json, power_score, updated_at) FROM stdin;
8	{"hero": {"xp": "580", "level": 3, "aiRules": {"saveSpForBoss": true, "rushSpecialist": true, "nullifyGeoEffect": true, "triggerPartyCombo": true}, "playerId": "8", "spriteId": "hero_warrior", "battleRow": "FRONT", "playerName": "Admin", "activeClass": "WARRIOR", "classMastery": {"MAGE": 0, "THIEF": 0, "CLERGY": 0, "WARRIOR": 0, "PROFESSOR": 0, "HEAVY_KNIGHT": 0, "MAGIC_KNIGHT": 0}, "equippedGear": {"armor": {"name": "Iron Mail", "rank": 1, "slot": "ARMOR", "itemId": "arm_start_8", "rarity": "COMMON", "maxFloor": 30, "baseStats": {"hp": "36", "atk": "5", "def": "18", "int": "5", "res": "16", "spd": "4"}, "bossKills": 0, "itemLevel": 0, "templateId": "armor_r1", "specialists": [{"id": "spec_s_8_2", "type": "COACH", "level": 2, "subdued": false}], "currentFloor": 0, "passiveTraits": [], "maxSpecialistSlots": 2}, "emblem": {"name": "Iron Crest", "rank": 1, "slot": "EMBLEM", "itemId": "emb_start_8", "rarity": "COMMON", "maxFloor": 30, "baseStats": {"hp": "24", "atk": "12", "def": "10", "int": "12", "res": "10", "spd": "8"}, "bossKills": 0, "itemLevel": 0, "templateId": "emblem_r1", "specialists": [], "currentFloor": 0, "passiveTraits": [], "maxSpecialistSlots": 2}, "weapon": {"name": "Iron Blade", "rank": 1, "slot": "WEAPON", "itemId": "wpn_start_8", "rarity": "COMMON", "maxFloor": 30, "baseStats": {"hp": "14", "atk": "22", "def": "4", "int": "5", "res": "4", "spd": "4"}, "bossKills": 1, "itemLevel": 13, "templateId": "weapon_sword_r1", "weaponType": "SWORD", "specialists": [], "currentFloor": 10, "passiveTraits": [], "maxSpecialistSlots": 2}, "accessory": {"name": "Iron Sandals", "rank": 1, "slot": "ACCESSORY", "itemId": "acc_start_8", "rarity": "COMMON", "maxFloor": 30, "baseStats": {"hp": "14", "atk": "5", "def": "4", "int": "5", "res": "4", "spd": "18"}, "bossKills": 0, "itemLevel": 0, "templateId": "accessory_r1", "specialists": [], "currentFloor": 0, "passiveTraits": [], "maxSpecialistSlots": 2}}, "storedLevels": 0, "weaponMastery": 6, "classMasteryXp": {"MAGE": 0, "THIEF": 0, "CLERGY": 0, "WARRIOR": 100, "PROFESSOR": 0, "HEAVY_KNIGHT": 0, "MAGIC_KNIGHT": 0}, "reincarnations": 0, "inheritedPassives": []}, "karma": 8, "userId": 8, "campInbox": [], "cheatShop": {"starCap": 1, "xpSlider": 100, "dropSlider": 100, "activeStars": 0, "masterySlider": 100, "carnageEnabled": false}, "inventory": [{"name": "Bronze Mail", "rank": 2, "slot": "ARMOR", "itemId": "armor_r2_mwrqz85m_k2av", "rarity": "COMMON", "maxFloor": 30, "baseStats": {"hp": "45", "atk": "6", "def": "22", "int": "6", "res": "20", "spd": "5"}, "bossKills": 0, "itemLevel": 0, "templateId": "armor_r2", "specialists": [], "currentFloor": 0, "passiveTraits": [], "maxSpecialistSlots": 2}], "karmaUpgrades": {"shopRank": 2, "aptitudeRank": 0, "dimensionalRank": 0, "focusEfficiencyRank": 0}, "openPartyPool": true, "raidDamageDealt": "0", "totalExpeditions": 1, "highestClearedFloor": 10, "specialistWarehouse": [{"id": "spec_mwrqz85m_1hbo", "type": "TUTOR", "level": 22, "subdued": true}, {"id": "spec_mwrqz85l_1w2f", "type": "BROKER", "level": 20, "subdued": true}, {"id": "spec_mwrqz85l_rndt", "type": "DIETICIAN", "level": 14, "subdued": true}, {"id": "spec_mwrqz85k_d3xe", "type": "STATISTICIAN", "level": 12, "subdued": true}, {"id": "spec_mwrqz85k_xrrc", "type": "COACH", "level": 10, "subdued": true}, {"id": "spec_mwrqz85j_ikrb", "type": "GLADIATOR", "level": 6, "subdued": true}], "totalItemGodsDefeated": 0, "recruitOpenPartyAllies": false, "totalSpecialistsSubdued": 6, "totalGatekeepersDefeated": 1}	529	2026-11-22 11:22:51.138388+00
16	{"hero": {"xp": "0", "level": 1, "aiRules": {"saveSpForBoss": true, "rushSpecialist": true, "nullifyGeoEffect": true, "triggerPartyCombo": true}, "playerId": "16", "spriteId": "hero_warrior", "battleRow": "FRONT", "playerName": "melon", "activeClass": "WARRIOR", "classMastery": {"MAGE": 0, "THIEF": 0, "CLERGY": 0, "WARRIOR": 0, "PROFESSOR": 0, "HEAVY_KNIGHT": 0, "MAGIC_KNIGHT": 0}, "equippedGear": {"armor": {"name": "Iron Mail", "rank": 1, "slot": "ARMOR", "itemId": "arm_start_16", "rarity": "COMMON", "maxFloor": 30, "baseStats": {"hp": "36", "atk": "5", "def": "18", "int": "5", "res": "16", "spd": "4"}, "bossKills": 0, "itemLevel": 0, "templateId": "armor_r1", "specialists": [{"id": "spec_s_16_2", "type": "COACH", "level": 2, "subdued": false}], "currentFloor": 0, "passiveTraits": [], "maxSpecialistSlots": 2}, "emblem": {"name": "Iron Crest", "rank": 1, "slot": "EMBLEM", "itemId": "emb_start_16", "rarity": "COMMON", "maxFloor": 30, "baseStats": {"hp": "24", "atk": "12", "def": "10", "int": "12", "res": "10", "spd": "8"}, "bossKills": 0, "itemLevel": 0, "templateId": "emblem_r1", "specialists": [], "currentFloor": 0, "passiveTraits": [], "maxSpecialistSlots": 2}, "weapon": {"name": "Iron Blade", "rank": 1, "slot": "WEAPON", "itemId": "wpn_start_16", "rarity": "COMMON", "maxFloor": 30, "baseStats": {"hp": "14", "atk": "22", "def": "4", "int": "5", "res": "4", "spd": "4"}, "bossKills": 0, "itemLevel": 0, "templateId": "weapon_sword_r1", "weaponType": "SWORD", "specialists": [{"id": "spec_s_16_1", "type": "GLADIATOR", "level": 3, "subdued": false}], "currentFloor": 0, "passiveTraits": [], "maxSpecialistSlots": 2}, "accessory": {"name": "Iron Sandals", "rank": 1, "slot": "ACCESSORY", "itemId": "acc_start_16", "rarity": "COMMON", "maxFloor": 30, "baseStats": {"hp": "14", "atk": "5", "def": "4", "int": "5", "res": "4", "spd": "18"}, "bossKills": 0, "itemLevel": 0, "templateId": "accessory_r1", "specialists": [], "currentFloor": 0, "passiveTraits": [], "maxSpecialistSlots": 2}}, "storedLevels": 0, "weaponMastery": 1, "classMasteryXp": {"MAGE": 0, "THIEF": 0, "CLERGY": 0, "WARRIOR": 0, "PROFESSOR": 0, "HEAVY_KNIGHT": 0, "MAGIC_KNIGHT": 0}, "reincarnations": 0, "inheritedPassives": []}, "karma": 0, "userId": 16, "campInbox": [], "cheatShop": {"starCap": 1, "xpSlider": 100, "dropSlider": 100, "activeStars": 0, "masterySlider": 100, "carnageEnabled": false}, "inventory": [], "karmaUpgrades": {"shopRank": 1, "aptitudeRank": 0, "dimensionalRank": 0, "focusEfficiencyRank": 0}, "openPartyPool": true, "raidDamageDealt": "0", "totalExpeditions": 0, "highestClearedFloor": 0, "specialistWarehouse": [], "totalItemGodsDefeated": 0, "recruitOpenPartyAllies": false, "totalSpecialistsSubdued": 0, "totalGatekeepersDefeated": 0}	299	2026-11-22 10:24:40.962583+00
15	{"hero": {"xp": "0", "level": 1, "aiRules": {"saveSpForBoss": true, "rushSpecialist": true, "nullifyGeoEffect": true, "triggerPartyCombo": true}, "playerId": "15", "spriteId": "player_character", "battleRow": "BACK", "playerName": "Dauss", "activeClass": "CLERGY", "classMastery": {"MAGE": 0, "THIEF": 0, "CLERGY": 0, "WARRIOR": 0, "PROFESSOR": 0, "HEAVY_KNIGHT": 0, "MAGIC_KNIGHT": 0}, "equippedGear": {"armor": {"name": "Leather Armor", "rank": 1, "slot": "ARMOR", "itemId": "arm_start_15", "rarity": "COMMON", "maxFloor": 30, "baseStats": {"hp": "36", "atk": "5", "def": "18", "int": "5", "res": "16", "spd": "4"}, "bossKills": 0, "itemLevel": 0, "templateId": "armor_r1", "specialists": [{"id": "spec_s_15_2", "type": "COACH", "level": 2, "subdued": false}], "currentFloor": 0, "passiveTraits": [], "maxSpecialistSlots": 2}, "weapon": {"name": "Wooden Sword", "rank": 1, "slot": "WEAPON", "itemId": "wpn_start_15", "rarity": "COMMON", "maxFloor": 30, "baseStats": {"hp": "14", "atk": "22", "def": "4", "int": "5", "res": "4", "spd": "4"}, "bossKills": 0, "itemLevel": 0, "templateId": "weapon_sword_r1", "weaponType": "SWORD", "specialists": [{"id": "spec_s_15_1", "type": "TUTOR", "level": 2, "subdued": false}], "currentFloor": 0, "passiveTraits": [], "maxSpecialistSlots": 2}}, "storedLevels": 0, "weaponMastery": 1, "classMasteryXp": {"MAGE": 0, "THIEF": 0, "CLERGY": 0, "WARRIOR": 0, "PROFESSOR": 0, "HEAVY_KNIGHT": 0, "MAGIC_KNIGHT": 0}, "reincarnations": 0, "inheritedPassives": []}, "karma": 0, "userId": 15, "campInbox": [], "cheatShop": {"starCap": 1, "xpSlider": 100, "dropSlider": 100, "activeStars": 0, "masterySlider": 100, "carnageEnabled": false}, "inventory": [], "karmaUpgrades": {"shopRank": 1, "aptitudeRank": 0, "dimensionalRank": 0, "focusEfficiencyRank": 0}, "openPartyPool": true, "raidDamageDealt": "0", "totalExpeditions": 0, "highestClearedFloor": 0, "specialistWarehouse": [], "totalItemGodsDefeated": 0, "recruitOpenPartyAllies": false, "totalSpecialistsSubdued": 0, "totalGatekeepersDefeated": 0}	198	2026-11-22 11:43:53.783735+00
\.


--
-- Data for Name: rpg_raid_state; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rpg_raid_state (week_key, raid_json, updated_at) FROM stdin;
2026-11-16	{"name": "Overlord Minotaur", "maxHp": "1000000000000", "title": "Weekly Trillion-HP Labyrinth Gatekeeper", "bossId": "minotaur", "raidId": "raid_2026-11-16_minotaur", "weekKey": "2026-11-16", "currentHp": "1000000000000", "attackFpCost": 50, "topContributors": [], "totalParticipants": 0}	2026-11-22 09:47:28.163792+00
\.


--
-- Data for Name: rpg_trade_offers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rpg_trade_offers (offer_id, squad_id, sender_id, offer_json, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: space_inventories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.space_inventories (id, space_id, name, bought, created_by, created_at, updated_at) FROM stdin;
2	user_space_15	Bawang	t	15	2026-11-17 09:11:22.364074+00	2026-11-17 11:30:55.016577+00
3	user_space_15	ayam	f	16	2026-11-17 15:32:42.125623+00	2026-11-17 15:32:50.98478+00
\.


--
-- Data for Name: spaces; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.spaces (id, name, category, owner_id, is_public, is_superadmin_space, whitelist, created_at, updated_at, tiles, private_zones, jukeboxes, typewriters, ashtrays, chess_boards, aquariums, shared_owners, inventories, focus_theme, seller_npc) FROM stdin;
user_space_16	hanabilaa's Space	Personal	16	f	f	["firdaus531"]	2026-11-17 15:24:05.30279+00	2026-11-17 15:30:39.666121+00	{}	[]	[]	[]	[]	[]	[]	[]	[]	auto	\N
user_space_14	EmberF's Space	Personal	14	f	f	[]	2026-10-29 10:32:28.279711+00	2026-10-29 10:32:28.279711+00	{}	[]	[]	[]	[]	[]	[]	[]	[]	auto	\N
user_space_11	CheeWei's Space	Personal	11	f	f	[]	2026-10-29 01:34:07.556118+00	2026-11-16 02:21:13.240294+00	{"0,0": "grass_3", "0,1": "grass_3", "0,2": "grass_3", "0,3": "grass_3", "0,4": "grass_3", "0,5": "grass_3", "0,6": "grass_3", "0,7": "grass_3", "0,8": "grass_3", "0,9": "grass_3", "1,0": "grass_3", "1,1": "grass_3", "1,2": "grass_3", "1,3": "grass_3", "1,4": "grass_3", "1,5": "grass_3", "1,6": "grass_3", "1,7": "grass_3", "1,8": "grass_3", "1,9": "grass_3", "2,0": "grass_3", "2,1": "grass_3", "2,2": "grass_3", "2,3": "grass_3", "2,4": "grass_3", "2,5": "grass_3", "2,6": "grass_3", "2,7": "grass_3", "2,8": "grass_3", "2,9": "grass_3", "3,0": "grass_3", "3,1": "grass_3", "3,2": "grass_3", "3,3": "grass_3", "3,4": "grass_3", "3,5": "grass_3", "3,6": "grass_3", "3,7": "grass_3", "3,8": "grass_3", "3,9": "grass_3", "4,0": "grass_3", "4,1": "grass_3", "4,2": "grass_3", "4,3": "grass_3", "4,4": "grass_3", "4,5": "grass_3", "4,6": "grass_3", "4,7": "grass_3", "4,8": "grass_3", "4,9": "grass_3", "5,0": "grass_3", "5,1": "grass_3", "5,2": "grass_3", "5,3": "grass_3", "5,4": "grass_3", "5,5": "grass_3", "5,6": "grass_3", "5,7": "grass_3", "5,8": "grass_3", "5,9": "grass_3", "6,0": "grass_3", "6,1": "grass_3", "6,2": "grass_3", "6,3": "grass_3", "6,4": "grass_3", "6,5": "grass_3", "6,6": "grass_3", "6,7": "grass_3", "6,8": "grass_3", "6,9": "grass_3", "7,0": "grass_3", "7,1": "grass_3", "7,2": "grass_3", "7,3": "grass_3", "7,4": "grass_3", "7,5": "grass_3", "7,6": "grass_3", "7,7": "grass_3", "7,8": "grass_3", "7,9": "grass_3", "8,0": "grass_3", "8,1": "grass_3", "8,2": "grass_3", "8,3": "grass_3", "8,4": "grass_3", "8,5": "grass_3", "8,6": "grass_3", "8,7": "grass_3", "8,8": "grass_3", "8,9": "grass_3", "9,0": "grass_3", "9,1": "grass_3", "9,2": "grass_3", "9,3": "grass_3", "9,4": "grass_3", "9,5": "grass_3", "9,6": "grass_3", "9,7": "grass_3", "9,8": "grass_3", "9,9": "grass_3", "0,10": "grass_3", "0,11": "grass_3", "0,12": "grass_3", "0,13": "grass_3", "0,14": "grass_3", "0,15": "grass_3", "0,16": "grass_3", "0,17": "grass_3", "0,18": "grass_3", "0,19": "grass_3", "0,20": "grass_3", "0,21": "grass_3", "0,22": "grass_3", "0,23": "grass_3", "0,24": "grass_3", "0,25": "grass_3", "0,26": "grass_3", "0,27": "grass_3", "0,28": "grass_3", "0,29": "grass_3", "0,30": "grass_3", "0,31": "grass_3", "0,32": "grass_3", "0,33": "grass_3", "0,34": "grass_3", "0,35": "grass_3", "1,10": "grass_3", "1,11": "grass_3", "1,12": "grass_3", "1,13": "grass_3", "1,14": "grass_3", "1,15": "grass_3", "1,16": "grass_3", "1,17": "grass_3", "1,18": "grass_3", "1,19": "grass_3", "1,20": "grass_3", "1,21": "grass_3", "1,22": "grass_3", "1,23": "grass_3", "1,24": "grass_3", "1,25": "grass_3", "1,26": "grass_3", "1,27": "grass_3", "1,28": "grass_3", "1,29": "grass_3", "1,30": "grass_3", "1,31": "grass_3", "1,32": "grass_3", "1,33": "grass_3", "1,34": "grass_3", "1,35": "grass_3", "10,0": "grass_3", "10,1": "grass_3", "10,2": "grass_3", "10,3": "grass_3", "10,4": "grass_3", "10,5": "grass_3", "10,6": "grass_3", "10,7": "grass_3", "10,8": "grass_3", "10,9": "grass_3", "11,0": "grass_3", "11,1": "grass_3", "11,2": "grass_3", "11,3": "grass_3", "11,4": "grass_3", "11,5": "grass_3", "11,6": "grass_3", "11,7": "grass_3", "11,8": "grass_3", "11,9": "grass_3", "12,0": "grass_3", "12,1": "grass_3", "12,2": "grass_3", "12,3": "grass_3", "12,4": "grass_3", "12,5": "grass_3", "12,6": "grass_3", "12,7": "grass_3", "12,8": "grass_3", "12,9": "grass_3", "13,0": "grass_3", "13,1": "grass_3", "13,2": "grass_3", "13,3": "grass_3", "13,4": "grass_3", "13,5": "grass_3", "13,6": "grass_3", "13,7": "grass_3", "13,8": "grass_3", "13,9": "grass_3", "14,0": "grass_3", "14,1": "grass_3", "14,2": "grass_3", "14,3": "grass_3", "14,4": "grass_3", "14,5": "grass_3", "14,6": "grass_3", "14,7": "grass_3", "14,8": "grass_3", "14,9": "grass_3", "15,0": "grass_3", "15,1": "grass_3", "15,2": "grass_3", "15,3": "grass_3", "15,4": "grass_3", "15,5": "grass_3", "15,6": "grass_3", "15,7": "grass_3", "15,8": "grass_3", "15,9": "grass_3", "16,0": "grass_3", "16,1": "grass_3", "16,2": "grass_3", "16,3": "grass_3", "16,4": "grass_3", "16,5": "grass_3", "16,6": "grass_3", "16,7": "grass_3", "16,8": "grass_3", "16,9": "grass_3", "17,0": "grass_3", "17,1": "grass_3", "17,2": "grass_3", "17,3": "grass_3", "17,4": "grass_3", "17,5": "grass_3", "17,6": "grass_3", "17,7": "grass_3", "17,8": "grass_3", "17,9": "grass_3", "18,0": "grass_3", "18,1": "grass_3", "18,2": "grass_3", "18,3": "grass_3", "18,4": "grass_3", "18,5": "grass_3", "18,6": "grass_3", "18,7": "grass_3", "18,8": "grass_3", "18,9": "grass_3", "19,0": "grass_3", "19,1": "grass_3", "19,2": "grass_3", "19,3": "grass_3", "19,4": "grass_3", "19,5": "grass_3", "19,6": "grass_3", "19,7": "grass_3", "19,8": "grass_3", "19,9": "grass_3", "2,10": "grass_3", "2,11": "grass_3", "2,12": "grass_3", "2,13": "grass_3", "2,14": "grass_3", "2,15": "grass_3", "2,16": "grass_3", "2,17": "grass_3", "2,18": "grass_3", "2,19": "grass_3", "2,20": "grass_3", "2,21": "grass_3", "2,22": "grass_3", "2,23": "grass_3", "2,24": "grass_3", "2,25": "grass_3", "2,26": "grass_3", "2,27": "grass_3", "2,28": "grass_3", "2,29": "grass_3", "2,30": "grass_3", "2,31": "grass_3", "2,32": "grass_3", "2,33": "grass_3", "2,34": "grass_3", "2,35": "grass_3", "20,0": "grass_3", "20,1": "grass_3", "20,2": "grass_3", "20,3": "grass_3", "20,4": "grass_3", "20,5": "grass_3", "20,6": "grass_3", "20,7": "grass_3", "20,8": "grass_3", "20,9": "grass_3", "21,0": "grass_3", "21,1": "grass_3", "21,2": "grass_3", "21,3": "grass_3", "21,4": "grass_3", "21,5": "grass_3", "21,6": "grass_3", "21,7": "grass_3", "21,8": "grass_3", "21,9": "grass_3", "22,0": "grass_3", "22,1": "grass_3", "22,2": "grass_3", "22,3": "grass_3", "22,4": "grass_3", "22,5": "grass_3", "22,6": "grass_3", "22,7": "grass_3", "22,8": "grass_3", "22,9": "grass_3", "23,0": "grass_3", "23,1": "grass_3", "23,2": "grass_3", "23,3": "grass_3", "23,4": "grass_3", "23,5": "grass_3", "23,6": "grass_3", "23,7": "grass_3", "23,8": "grass_3", "23,9": "grass_3", "24,0": "grass_3", "24,1": "grass_3", "24,2": "grass_3", "24,3": "grass_3", "24,4": "grass_3", "24,5": "grass_3", "24,6": "grass_3", "24,7": "grass_3", "24,8": "grass_3", "24,9": "grass_3", "25,0": "grass_3", "25,1": "grass_3", "25,2": "grass_3", "25,3": "grass_3", "25,4": "grass_3", "25,5": "grass_3", "25,6": "grass_3", "25,7": "grass_3", "25,8": "grass_3", "25,9": "grass_3", "26,0": "grass_3", "26,1": "grass_3", "26,2": "grass_3", "26,3": "grass_3", "26,4": "grass_3", "26,5": "grass_3", "26,6": "grass_3", "26,7": "grass_3", "26,8": "grass_3", "26,9": "grass_3", "27,0": "grass_3", "27,1": "grass_3", "27,2": "grass_3", "27,3": "grass_3", "27,4": "grass_3", "27,5": "grass_3", "27,6": "grass_3", "27,7": "grass_3", "27,8": "grass_3", "27,9": "grass_3", "28,0": "grass_3", "28,1": "grass_3", "28,2": "grass_3", "28,3": "grass_3", "28,4": "grass_3", "28,5": "grass_3", "28,6": "grass_3", "28,7": "grass_3", "28,8": "grass_3", "28,9": "grass_3", "29,0": "grass_3", "29,1": "grass_3", "29,2": "grass_3", "29,3": "grass_3", "29,4": "grass_3", "29,5": "grass_3", "29,6": "grass_3", "29,7": "grass_3", "29,8": "grass_3", "29,9": "grass_3", "3,10": "grass_3", "3,11": "grass_3", "3,12": "grass_3", "3,13": "grass_3", "3,14": "grass_3", "3,15": "grass_3", "3,16": "grass_3", "3,17": "grass_3", "3,18": "grass_3", "3,19": "grass_3", "3,20": "grass_3", "3,21": "grass_3", "3,22": "grass_3", "3,23": "grass_3", "3,24": "grass_3", "3,25": "grass_3", "3,26": "grass_3", "3,27": "grass_3", "3,28": "grass_3", "3,29": "grass_3", "3,30": "grass_3", "3,31": "grass_3", "3,32": "grass_3", "3,33": "grass_3", "3,34": "grass_3", "3,35": "grass_3", "30,0": "grass_3", "30,1": "grass_3", "30,2": "grass_3", "30,3": "grass_3", "30,4": "grass_3", "30,5": "grass_3", "30,6": "grass_3", "30,7": "grass_3", "30,8": "grass_3", "30,9": "grass_3", "31,0": "grass_3", "31,1": "grass_3", "31,2": "grass_3", "31,3": "grass_3", "31,4": "grass_3", "31,5": "grass_3", "31,6": "grass_3", "31,7": "grass_3", "31,8": "grass_3", "31,9": "grass_3", "32,0": "grass_3", "32,1": "grass_3", "32,2": "grass_3", "32,3": "grass_3", "32,4": "grass_3", "32,5": "grass_3", "32,6": "grass_3", "32,7": "grass_3", "32,8": "grass_3", "32,9": "grass_3", "33,0": "grass_3", "33,1": "grass_3", "33,2": "grass_3", "33,3": "grass_3", "33,4": "grass_3", "33,5": "grass_3", "33,6": "grass_3", "33,7": "grass_3", "33,8": "grass_3", "33,9": "grass_3", "34,0": "grass_3", "34,1": "grass_3", "34,2": "grass_3", "34,3": "grass_3", "34,4": "grass_3", "34,5": "grass_3", "34,6": "grass_3", "34,7": "grass_3", "34,8": "grass_3", "34,9": "grass_3", "35,0": "grass_3", "35,1": "grass_3", "35,2": "grass_3", "35,3": "grass_3", "35,4": "grass_3", "35,5": "grass_3", "35,6": "grass_3", "35,7": "grass_3", "35,8": "grass_3", "35,9": "grass_3", "36,0": "grass_3", "36,1": "grass_3", "36,2": "grass_3", "36,3": "grass_3", "36,4": "grass_3", "36,5": "grass_3", "36,6": "grass_3", "36,7": "grass_3", "36,8": "grass_3", "36,9": "grass_3", "37,0": "grass_3", "37,1": "grass_3", "37,2": "grass_3", "37,3": "grass_3", "37,4": "grass_3", "37,5": "grass_3", "37,6": "grass_3", "37,7": "grass_3", "37,8": "grass_3", "37,9": "grass_3", "38,0": "grass_3", "38,1": "grass_3", "38,2": "grass_3", "38,3": "grass_3", "38,4": "grass_3", "38,5": "grass_3", "38,6": "grass_3", "38,7": "grass_3", "38,8": "grass_3", "38,9": "grass_3", "39,0": "grass_3", "39,1": "grass_3", "39,2": "grass_3", "39,3": "grass_3", "39,4": "grass_3", "39,5": "grass_3", "39,6": "grass_3", "39,7": "grass_3", "39,8": "grass_3", "39,9": "grass_3", "4,10": "grass_3", "4,11": "grass_3", "4,12": "grass_3", "4,13": "grass_3", "4,14": "grass_3", "4,15": "grass_3", "4,16": "grass_3", "4,17": "grass_3", "4,18": "grass_3", "4,19": "grass_3", "4,20": "grass_3", "4,21": "grass_3", "4,22": "grass_3", "4,23": "grass_3", "4,24": "grass_3", "4,25": "grass_3", "4,26": "grass_3", "4,27": "grass_3", "4,28": "grass_3", "4,29": "grass_3", "4,30": "grass_3", "4,31": "grass_3", "4,32": "grass_3", "4,33": "grass_3", "4,34": "grass_3", "4,35": "grass_3", "40,0": "grass_3", "40,1": "grass_3", "40,2": "grass_3", "40,3": "grass_3", "40,4": "grass_3", "40,5": "grass_3", "40,6": "grass_3", "40,7": "grass_3", "40,8": "grass_3", "40,9": "grass_3", "41,0": "grass_3", "41,1": "grass_3", "41,2": "grass_3", "41,3": "grass_3", "41,4": "grass_3", "41,5": "grass_3", "41,6": "grass_3", "41,7": "grass_3", "41,8": "grass_3", "41,9": "grass_3", "42,0": "grass_3", "42,1": "grass_3", "42,2": "grass_3", "42,3": "grass_3", "42,4": "grass_3", "42,5": "grass_3", "42,6": "grass_3", "42,7": "grass_3", "42,8": "grass_3", "42,9": "grass_3", "43,0": "grass_3", "43,1": "grass_3", "43,2": "grass_3", "43,3": "grass_3", "43,4": "grass_3", "43,5": "grass_3", "43,6": "grass_3", "43,7": "grass_3", "43,8": "grass_3", "43,9": "grass_3", "44,0": "grass_3", "44,1": "grass_3", "44,2": "grass_3", "44,3": "grass_3", "44,4": "grass_3", "44,5": "grass_3", "44,6": "grass_3", "44,7": "grass_3", "44,8": "grass_3", "44,9": "grass_3", "45,0": "grass_3", "45,1": "grass_3", "45,2": "grass_3", "45,3": "grass_3", "45,4": "grass_3", "45,5": "grass_3", "45,6": "grass_3", "45,7": "grass_3", "45,8": "grass_3", "45,9": "grass_3", "46,0": "grass_3", "46,1": "grass_3", "46,2": "grass_3", "46,3": "grass_3", "46,4": "grass_3", "46,5": "grass_3", "46,6": "grass_3", "46,7": "grass_3", "46,8": "grass_3", "46,9": "grass_3", "47,0": "grass_3", "47,1": "grass_3", "47,2": "grass_3", "47,3": "grass_3", "47,4": "grass_3", "47,5": "grass_3", "47,6": "grass_3", "47,7": "grass_3", "47,8": "grass_3", "47,9": "grass_3", "5,10": "grass_3", "5,11": "grass_3", "5,12": "grass_3", "5,13": "grass_3", "5,14": "grass_3", "5,15": "grass_3", "5,16": "grass_3", "5,17": "grass_3", "5,18": "grass_3", "5,19": "grass_3", "5,20": "grass_3", "5,21": "grass_3", "5,22": "grass_3", "5,23": "grass_3", "5,24": "grass_3", "5,25": "grass_3", "5,26": "grass_3", "5,27": "grass_3", "5,28": "grass_3", "5,29": "grass_3", "5,30": "grass_3", "5,31": "grass_3", "5,32": "grass_3", "5,33": "grass_3", "5,34": "grass_3", "5,35": "grass_3", "6,10": "grass_3", "6,11": "grass_3", "6,12": "grass_3", "6,13": "grass_3", "6,14": "grass_3", "6,15": "grass_3", "6,16": "grass_3", "6,17": "grass_3", "6,18": "grass_3", "6,19": "grass_3", "6,20": "grass_3", "6,21": "grass_3", "6,22": "grass_3", "6,23": "grass_3", "6,24": "grass_3", "6,25": "grass_3", "6,26": "grass_3", "6,27": "grass_3", "6,28": "grass_3", "6,29": "grass_3", "6,30": "grass_3", "6,31": "grass_3", "6,32": "grass_3", "6,33": "grass_3", "6,34": "grass_3", "6,35": "grass_3", "7,10": "grass_3", "7,11": "grass_3", "7,12": "grass_3", "7,13": "grass_3", "7,14": "grass_3", "7,15": "grass_3", "7,16": "grass_3", "7,17": "grass_3", "7,18": "grass_3", "7,19": "grass_3", "7,20": "grass_3", "7,21": "grass_3", "7,22": "grass_3", "7,23": "grass_3", "7,24": "grass_3", "7,25": "grass_3", "7,26": "grass_3", "7,27": "grass_3", "7,28": "grass_3", "7,29": "grass_3", "7,30": "grass_3", "7,31": "grass_3", "7,32": "grass_3", "7,33": "grass_3", "7,34": "grass_3", "7,35": "grass_3", "8,10": "grass_3", "8,11": "grass_3", "8,12": "grass_3", "8,13": "grass_3", "8,14": "grass_3", "8,15": "grass_3", "8,16": "grass_3", "8,17": "grass_3", "8,18": "grass_3", "8,19": "grass_3", "8,20": "grass_3", "8,21": "grass_3", "8,22": "grass_3", "8,23": "grass_3", "8,24": "grass_3", "8,25": "grass_3", "8,26": "grass_3", "8,27": "grass_3", "8,28": "grass_3", "8,29": "grass_3", "8,30": "grass_3", "8,31": "grass_3", "8,32": "grass_3", "8,33": "grass_3", "8,34": "grass_3", "8,35": "grass_3", "9,10": "grass_3", "9,11": "grass_3", "9,12": "grass_3", "9,13": "grass_3", "9,14": "grass_3", "9,15": "grass_3", "9,16": "grass_3", "9,17": "grass_3", "9,18": "grass_3", "9,19": "grass_3", "9,20": "grass_3", "9,21": "grass_3", "9,22": "grass_3", "9,23": "grass_3", "9,24": "grass_3", "9,25": "grass_3", "9,26": "grass_3", "9,27": "grass_3", "9,28": "grass_3", "9,29": "grass_3", "9,30": "grass_3", "9,31": "grass_3", "9,32": "grass_3", "9,33": "grass_3", "9,34": "grass_3", "9,35": "grass_3", "10,10": "grass_3", "10,11": "grass_3", "10,12": "grass_3", "10,13": "grass_3", "10,14": "grass_3", "10,15": "grass_3", "10,16": "grass_3", "10,17": "grass_3", "10,18": "grass_3", "10,19": "grass_3", "10,20": "grass_3", "10,21": "grass_3", "10,22": "grass_3", "10,23": "grass_3", "10,24": "grass_3", "10,25": "grass_3", "10,26": "grass_3", "10,27": "grass_3", "10,28": "grass_3", "10,29": "grass_3", "10,30": "grass_3", "10,31": "grass_3", "10,32": "grass_3", "10,33": "grass_3", "10,34": "grass_3", "10,35": "grass_3", "11,10": "grass_3", "11,11": "grass_3", "11,12": "grass_3", "11,13": "grass_3", "11,14": "grass_3", "11,15": "grass_3", "11,16": "grass_3", "11,17": "grass_3", "11,18": "grass_3", "11,19": "grass_3", "11,20": "grass_3", "11,21": "grass_3", "11,22": "grass_3", "11,23": "grass_3", "11,24": "grass_3", "11,25": "grass_3", "11,26": "grass_3", "11,27": "grass_3", "11,28": "grass_3", "11,29": "grass_3", "11,30": "grass_3", "11,31": "grass_3", "11,32": "grass_3", "11,33": "grass_3", "11,34": "grass_3", "11,35": "grass_3", "12,10": "grass_3", "12,11": "grass_3", "12,12": "grass_3", "12,13": "grass_3", "12,14": "grass_3", "12,15": "grass_3", "12,16": "grass_3", "12,17": "grass_3", "12,18": "grass_3", "12,19": "grass_3", "12,20": "grass_3", "12,21": "grass_3", "12,22": "grass_3", "12,23": "grass_3", "12,24": "grass_3", "12,25": "grass_3", "12,26": "grass_3", "12,27": "grass_3", "12,28": "grass_3", "12,29": "grass_3", "12,30": "grass_3", "12,31": "grass_3", "12,32": "grass_3", "12,33": "grass_3", "12,34": "grass_3", "12,35": "grass_3", "13,10": "grass_3", "13,11": "grass_3", "13,12": "grass_3", "13,13": "grass_3", "13,14": "grass_3", "13,15": "grass_3", "13,16": "grass_3", "13,17": "grass_3", "13,18": "grass_3", "13,19": "grass_3", "13,20": "grass_3", "13,21": "grass_3", "13,22": "grass_3", "13,23": "grass_3", "13,24": "grass_3", "13,25": "grass_3", "13,26": "grass_3", "13,27": "grass_3", "13,28": "grass_3", "13,29": "grass_3", "13,30": "grass_3", "13,31": "grass_3", "13,32": "grass_3", "13,33": "grass_3", "13,34": "grass_3", "13,35": "grass_3", "14,10": "grass_3", "14,11": "grass_3", "14,12": "grass_3", "14,13": "grass_3", "14,14": "grass_3", "14,15": "grass_3", "14,16": "grass_3", "14,17": "grass_3", "14,18": "grass_3", "14,19": "grass_3", "14,20": "grass_3", "14,21": "grass_3", "14,22": "grass_3", "14,23": "grass_3", "14,24": "grass_3", "14,25": "grass_3", "14,26": "grass_3", "14,27": "grass_3", "14,28": "grass_3", "14,29": "grass_3", "14,30": "grass_3", "14,31": "grass_3", "14,32": "grass_3", "14,33": "grass_3", "14,34": "grass_3", "14,35": "grass_3", "15,10": "grass_3", "15,11": "grass_3", "15,12": "grass_3", "15,13": "grass_3", "15,14": "grass_3", "15,15": "grass_3", "15,16": "grass_3", "15,17": "grass_3", "15,18": "grass_3", "15,19": "grass_3", "15,20": "grass_3", "15,21": "grass_3", "15,22": "grass_3", "15,23": "grass_3", "15,24": "grass_3", "15,25": "grass_3", "15,26": "grass_3", "15,27": "grass_3", "15,28": "grass_3", "15,29": "grass_3", "15,30": "grass_3", "15,31": "grass_3", "15,32": "grass_3", "15,33": "grass_3", "15,34": "grass_3", "15,35": "grass_3", "16,10": "grass_3", "16,11": "grass_3", "16,12": "grass_3", "16,13": "grass_3", "16,14": "grass_3", "16,15": "grass_3", "16,16": "grass_3", "16,17": "grass_3", "16,18": "grass_3", "16,19": "grass_3", "16,20": "grass_3", "16,21": "grass_3", "16,22": "grass_3", "16,23": "grass_3", "16,24": "grass_3", "16,25": "grass_3", "16,26": "grass_3", "16,27": "grass_3", "16,28": "grass_3", "16,29": "grass_3", "16,30": "grass_3", "16,31": "grass_3", "16,32": "grass_3", "16,33": "grass_3", "16,34": "grass_3", "16,35": "grass_3", "17,10": "grass_3", "17,11": "grass_3", "17,12": "grass_3", "17,13": "grass_3", "17,14": "grass_3", "17,15": "grass_3", "17,16": "grass_3", "17,17": "grass_3", "17,18": "grass_3", "17,19": "grass_3", "17,20": "grass_3", "17,21": "grass_3", "17,22": "grass_3", "17,23": "grass_3", "17,24": "grass_3", "17,25": "grass_3", "17,26": "grass_3", "17,27": "grass_3", "17,28": "grass_3", "17,29": "grass_3", "17,30": "grass_3", "17,31": "grass_3", "17,32": "grass_3", "17,33": "grass_3", "17,34": "grass_3", "17,35": "grass_3", "18,10": "grass_3", "18,11": "grass_3", "18,12": "grass_3", "18,13": "grass_3", "18,14": "grass_3", "18,15": "grass_3", "18,16": "grass_3", "18,17": "grass_3", "18,18": "grass_3", "18,19": "grass_3", "18,20": "grass_3", "18,21": "grass_3", "18,22": "grass_3", "18,23": "grass_3", "18,24": "grass_3", "18,25": "grass_3", "18,26": "grass_3", "18,27": "grass_3", "18,28": "grass_3", "18,29": "grass_3", "18,30": "grass_3", "18,31": "grass_3", "18,32": "grass_3", "18,33": "grass_3", "18,34": "grass_3", "18,35": "grass_3", "19,10": "grass_3", "19,11": "grass_3", "19,12": "grass_3", "19,13": "grass_3", "19,14": "grass_3", "19,15": "grass_3", "19,16": "grass_3", "19,17": "grass_3", "19,18": "grass_3", "19,19": "grass_3", "19,20": "grass_3", "19,21": "grass_3", "19,22": "grass_3", "19,23": "grass_3", "19,24": "grass_3", "19,25": "grass_3", "19,26": "grass_3", "19,27": "grass_3", "19,28": "grass_3", "19,29": "grass_3", "19,30": "grass_3", "19,31": "grass_3", "19,32": "grass_3", "19,33": "grass_3", "19,34": "grass_3", "19,35": "grass_3", "20,10": "grass_3", "20,11": "grass_3", "20,12": "grass_3", "20,13": "grass_3", "20,14": "grass_3", "20,15": "grass_3", "20,16": "grass_3", "20,17": "grass_3", "20,18": "grass_3", "20,19": "grass_3", "20,20": "grass_3", "20,21": "grass_3", "20,22": "grass_3", "20,23": "grass_3", "20,24": "grass_3", "20,25": "grass_3", "20,26": "grass_3", "20,27": "grass_3", "20,28": "grass_3", "20,29": "grass_3", "20,30": "grass_3", "20,31": "grass_3", "20,32": "grass_3", "20,33": "grass_3", "20,34": "grass_3", "20,35": "grass_3", "21,10": "grass_3", "21,11": "grass_3", "21,12": "grass_3", "21,13": "grass_3", "21,14": "grass_3", "21,15": "grass_3", "21,16": "grass_3", "21,17": "grass_3", "21,18": "grass_3", "21,19": "grass_3", "21,20": "grass_3", "21,21": "grass_3", "21,22": "grass_3", "21,23": "grass_3", "21,24": "grass_3", "21,25": "grass_3", "21,26": "grass_3", "21,27": "grass_3", "21,28": "grass_3", "21,29": "grass_3", "21,30": "grass_3", "21,31": "grass_3", "21,32": "grass_3", "21,33": "grass_3", "21,34": "grass_3", "21,35": "grass_3", "22,10": "grass_3", "22,11": "grass_3", "22,12": "grass_3", "22,13": "grass_3", "22,14": "grass_3", "22,15": "grass_3", "22,16": "grass_3", "22,17": "grass_3", "22,18": "grass_3", "22,19": "grass_3", "22,20": "grass_3", "22,21": "grass_3", "22,22": "grass_3", "22,23": "grass_3", "22,24": "grass_3", "22,25": "grass_3", "22,26": "grass_3", "22,27": "grass_3", "22,28": "grass_3", "22,29": "grass_3", "22,30": "grass_3", "22,31": "grass_3", "22,32": "grass_3", "22,33": "grass_3", "22,34": "grass_3", "22,35": "grass_3", "23,10": "grass_3", "23,11": "grass_3", "23,12": "grass_3", "23,13": "grass_3", "23,14": "grass_3", "23,15": "grass_3", "23,16": "grass_3", "23,17": "grass_3", "23,18": "grass_3", "23,19": "grass_3", "23,20": "grass_3", "23,21": "grass_3", "23,22": "grass_3", "23,23": "grass_3", "23,24": "grass_3", "23,25": "grass_3", "23,26": "grass_3", "23,27": "grass_3", "23,28": "grass_3", "23,29": "grass_3", "23,30": "grass_3", "23,31": "grass_3", "23,32": "grass_3", "23,33": "grass_3", "23,34": "grass_3", "23,35": "grass_3", "24,10": "grass_3", "24,11": "grass_3", "24,12": "grass_3", "24,13": "grass_3", "24,14": "grass_3", "24,15": "grass_3", "24,16": "grass_3", "24,17": "grass_3", "24,18": "grass_3", "24,19": "grass_3", "24,20": "grass_3", "24,21": "grass_3", "24,22": "grass_3", "24,23": "grass_3", "24,24": "grass_3", "24,25": "grass_3", "24,26": "grass_3", "24,27": "grass_3", "24,28": "grass_3", "24,29": "grass_3", "24,30": "grass_3", "24,31": "grass_3", "24,32": "grass_3", "24,33": "grass_3", "24,34": "grass_3", "24,35": "grass_3", "25,10": "grass_3", "25,11": "grass_3", "25,12": "grass_3", "25,13": "grass_3", "25,14": "grass_3", "25,15": "grass_3", "25,16": "grass_3", "25,17": "grass_3", "25,18": "grass_3", "25,19": "grass_3", "25,20": "grass_3", "25,21": "grass_3", "25,22": "grass_3", "25,23": "grass_3", "25,24": "grass_3", "25,25": "grass_3", "25,26": "grass_3", "25,27": "grass_3", "25,28": "grass_3", "25,29": "grass_3", "25,30": "grass_3", "25,31": "grass_3", "25,32": "grass_3", "25,33": "grass_3", "25,34": "grass_3", "25,35": "grass_3", "26,10": "grass_3", "26,11": "grass_3", "26,12": "grass_3", "26,13": "grass_3", "26,14": "grass_3", "26,15": "grass_3", "26,16": "grass_3", "26,17": "grass_3", "26,18": "grass_3", "26,19": "grass_3", "26,20": "grass_3", "26,21": "grass_3", "26,22": "grass_3", "26,23": "grass_3", "26,24": "grass_3", "26,25": "grass_3", "26,26": "grass_3", "26,27": "grass_3", "26,28": "grass_3", "26,29": "grass_3", "26,30": "grass_3", "26,31": "grass_3", "26,32": "grass_3", "26,33": "grass_3", "26,34": "grass_3", "26,35": "grass_3", "27,10": "grass_3", "27,11": "grass_3", "27,12": "grass_3", "27,13": "grass_3", "27,14": "grass_3", "27,15": "grass_3", "27,16": "grass_3", "27,17": "grass_3", "27,18": "grass_3", "27,19": "grass_3", "27,20": "grass_3", "27,21": "grass_3", "27,22": "grass_3", "27,23": "grass_3", "27,24": "grass_3", "27,25": "grass_3", "27,26": "grass_3", "27,27": "grass_3", "27,28": "grass_3", "27,29": "grass_3", "27,30": "grass_3", "27,31": "grass_3", "27,32": "grass_3", "27,33": "grass_3", "27,34": "grass_3", "27,35": "grass_3", "28,10": "grass_3", "28,11": "grass_3", "28,12": "grass_3", "28,13": "grass_3", "28,14": "grass_3", "28,15": "grass_3", "28,16": "grass_3", "28,17": "grass_3", "28,18": "grass_3", "28,19": "grass_3", "28,20": "grass_3", "28,21": "grass_3", "28,22": "grass_3", "28,23": "grass_3", "28,24": "grass_3", "28,25": "grass_3", "28,26": "grass_3", "28,27": "grass_3", "28,28": "grass_3", "28,29": "grass_3", "28,30": "grass_3", "28,31": "grass_3", "28,32": "grass_3", "28,33": "grass_3", "28,34": "grass_3", "28,35": "grass_3", "29,10": "grass_3", "29,11": "grass_3", "29,12": "grass_3", "29,13": "grass_3", "29,14": "grass_3", "29,15": "grass_3", "29,16": "grass_3", "29,17": "grass_3", "29,18": "grass_3", "29,19": "grass_3", "29,20": "grass_3", "29,21": "grass_3", "29,22": "grass_3", "29,23": "grass_3", "29,24": "grass_3", "29,25": "grass_3", "29,26": "grass_3", "29,27": "grass_3", "29,28": "grass_3", "29,29": "grass_3", "29,30": "grass_3", "29,31": "grass_3", "29,32": "grass_3", "29,33": "grass_3", "29,34": "grass_3", "29,35": "grass_3", "30,10": "grass_3", "30,11": "grass_3", "30,12": "grass_3", "30,13": "grass_3", "30,14": "grass_3", "30,15": "grass_3", "30,16": "grass_3", "30,17": "grass_3", "30,18": "grass_3", "30,19": "grass_3", "30,20": "grass_3", "30,21": "grass_3", "30,22": "grass_3", "30,23": "grass_3", "30,24": "grass_3", "30,25": "grass_3", "30,26": "grass_3", "30,27": "grass_3", "30,28": "grass_3", "30,29": "grass_3", "30,30": "grass_3", "30,31": "grass_3", "30,32": "grass_3", "30,33": "grass_3", "30,34": "grass_3", "30,35": "grass_3", "31,10": "grass_3", "31,11": "grass_3", "31,12": "grass_3", "31,13": "grass_3", "31,14": "grass_3", "31,15": "grass_3", "31,16": "grass_3", "31,17": "grass_3", "31,18": "grass_3", "31,19": "grass_3", "31,20": "grass_3", "31,21": "grass_3", "31,22": "grass_3", "31,23": "grass_3", "31,24": "grass_3", "31,25": "grass_3", "31,26": "grass_3", "31,27": "grass_3", "31,28": "grass_3", "31,29": "grass_3", "31,30": "grass_3", "31,31": "grass_3", "31,32": "grass_3", "31,33": "grass_3", "31,34": "grass_3", "31,35": "grass_3", "32,10": "grass_3", "32,11": "grass_3", "32,12": "grass_3", "32,13": "grass_3", "32,14": "grass_3", "32,15": "grass_3", "32,16": "grass_3", "32,17": "grass_3", "32,18": "grass_3", "32,19": "grass_3", "32,20": "grass_3", "32,21": "grass_3", "32,22": "grass_3", "32,23": "grass_3", "32,24": "grass_3", "32,25": "grass_3", "32,26": "grass_3", "32,27": "grass_3", "32,28": "grass_3", "32,29": "grass_3", "32,30": "grass_3", "32,31": "grass_3", "32,32": "grass_3", "32,33": "grass_3", "32,34": "grass_3", "32,35": "grass_3", "33,10": "grass_3", "33,11": "grass_3", "33,12": "grass_3", "33,13": "grass_3", "33,14": "grass_3", "33,15": "grass_3", "33,16": "grass_3", "33,17": "grass_3", "33,18": "grass_3", "33,19": "grass_3", "33,20": "grass_3", "33,21": "grass_3", "33,22": "grass_3", "33,23": "grass_3", "33,24": "grass_3", "33,25": "grass_3", "33,26": "grass_3", "33,27": "grass_3", "33,28": "grass_3", "33,29": "grass_3", "33,30": "grass_3", "33,31": "grass_3", "33,32": "grass_3", "33,33": "grass_3", "33,34": "grass_3", "33,35": "grass_3", "34,10": "grass_3", "34,11": "grass_3", "34,12": "grass_3", "34,13": "grass_3", "34,14": "grass_3", "34,15": "grass_3", "34,16": "grass_3", "34,17": "grass_3", "34,18": "grass_3", "34,19": "grass_3", "34,20": "grass_3", "34,21": "grass_3", "34,22": "grass_3", "34,23": "grass_3", "34,24": "grass_3", "34,25": "grass_3", "34,26": "grass_3", "34,27": "grass_3", "34,28": "grass_3", "34,29": "grass_3", "34,30": "grass_3", "34,31": "grass_3", "34,32": "grass_3", "34,33": "grass_3", "34,34": "grass_3", "34,35": "grass_3", "35,10": "grass_3", "35,11": "grass_3", "35,12": "grass_3", "35,13": "grass_3", "35,14": "grass_3", "35,15": "grass_3", "35,16": "grass_3", "35,17": "grass_3", "35,18": "grass_3", "35,19": "grass_3", "35,20": "grass_3", "35,21": "grass_3", "35,22": "grass_3", "35,23": "grass_3", "35,24": "grass_3", "35,25": "grass_3", "35,26": "grass_3", "35,27": "grass_3", "35,28": "grass_3", "35,29": "grass_3", "35,30": "grass_3", "35,31": "grass_3", "35,32": "grass_3", "35,33": "grass_3", "35,34": "grass_3", "35,35": "grass_3", "36,10": "grass_3", "36,11": "grass_3", "36,12": "grass_3", "36,13": "grass_3", "36,14": "grass_3", "36,15": "grass_3", "36,16": "grass_3", "36,17": "grass_3", "36,18": "grass_3", "36,19": "grass_3", "36,20": "grass_3", "36,21": "grass_3", "36,22": "grass_3", "36,23": "grass_3", "36,24": "grass_3", "36,25": "grass_3", "36,26": "grass_3", "36,27": "grass_3", "36,28": "grass_3", "36,29": "grass_3", "36,30": "grass_3", "36,31": "grass_3", "36,32": "grass_3", "36,33": "grass_3", "36,34": "grass_3", "36,35": "grass_3", "37,10": "grass_3", "37,11": "grass_3", "37,12": "grass_3", "37,13": "grass_3", "37,14": "grass_3", "37,15": "grass_3", "37,16": "grass_3", "37,17": "grass_3", "37,18": "grass_3", "37,19": "grass_3", "37,20": "grass_3", "37,21": "grass_3", "37,22": "grass_3", "37,23": "grass_3", "37,24": "grass_3", "37,25": "grass_3", "37,26": "grass_3", "37,27": "grass_3", "37,28": "grass_3", "37,29": "grass_3", "37,30": "grass_3", "37,31": "grass_3", "37,32": "grass_3", "37,33": "grass_3", "37,34": "grass_3", "37,35": "grass_3", "38,10": "grass_3", "38,11": "grass_3", "38,12": "grass_3", "38,13": "grass_3", "38,14": "grass_3", "38,15": "grass_3", "38,16": "grass_3", "38,17": "grass_3", "38,18": "grass_3", "38,19": "grass_3", "38,20": "grass_3", "38,21": "grass_3", "38,22": "grass_3", "38,23": "grass_3", "38,24": "grass_3", "38,25": "grass_3", "38,26": "grass_3", "38,27": "grass_3", "38,28": "grass_3", "38,29": "grass_3", "38,30": "grass_3", "38,31": "grass_3", "38,32": "grass_3", "38,33": "grass_3", "38,34": "grass_3", "38,35": "grass_3", "39,10": "grass_3", "39,11": "grass_3", "39,12": "grass_3", "39,13": "grass_3", "39,14": "grass_3", "39,15": "grass_3", "39,16": "grass_3", "39,17": "grass_3", "39,18": "grass_3", "39,19": "grass_3", "39,20": "grass_3", "39,21": "grass_3", "39,22": "grass_3", "39,23": "grass_3", "39,24": "grass_3", "39,25": "grass_3", "39,26": "grass_3", "39,27": "grass_3", "39,28": "grass_3", "39,29": "grass_3", "39,30": "grass_3", "39,31": "grass_3", "39,32": "grass_3", "39,33": "grass_3", "39,34": "grass_3", "39,35": "grass_3", "40,10": "grass_3", "40,11": "grass_3", "40,12": "grass_3", "40,13": "grass_3", "40,14": "grass_3", "40,15": "grass_3", "40,16": "grass_3", "40,17": "grass_3", "40,18": "grass_3", "40,19": "grass_3", "40,20": "grass_3", "40,21": "grass_3", "40,22": "grass_3", "40,23": "grass_3", "40,24": "grass_3", "40,25": "grass_3", "40,26": "grass_3", "40,27": "grass_3", "40,28": "grass_3", "40,29": "grass_3", "40,30": "grass_3", "40,31": "grass_3", "40,32": "grass_3", "40,33": "grass_3", "40,34": "grass_3", "40,35": "grass_3", "41,10": "grass_3", "41,11": "grass_3", "41,12": "grass_3", "41,13": "grass_3", "41,14": "grass_3", "41,15": "grass_3", "41,16": "grass_3", "41,17": "grass_3", "41,18": "grass_3", "41,19": "grass_3", "41,20": "grass_3", "41,21": "grass_3", "41,22": "grass_3", "41,23": "grass_3", "41,24": "grass_3", "41,25": "grass_3", "41,26": "grass_3", "41,27": "grass_3", "41,28": "grass_3", "41,29": "grass_3", "41,30": "grass_3", "41,31": "grass_3", "41,32": "grass_3", "41,33": "grass_3", "41,34": "grass_3", "41,35": "grass_3", "42,10": "grass_3", "42,11": "grass_3", "42,12": "grass_3", "42,13": "grass_3", "42,14": "grass_3", "42,15": "grass_3", "42,16": "grass_3", "42,17": "grass_3", "42,18": "grass_3", "42,19": "grass_3", "42,20": "grass_3", "42,21": "grass_3", "42,22": "grass_3", "42,23": "grass_3", "42,24": "grass_3", "42,25": "grass_3", "42,26": "grass_3", "42,27": "grass_3", "42,28": "grass_3", "42,29": "grass_3", "42,30": "grass_3", "42,31": "grass_3", "42,32": "grass_3", "42,33": "grass_3", "42,34": "grass_3", "42,35": "grass_3", "43,10": "grass_3", "43,11": "grass_3", "43,12": "grass_3", "43,13": "grass_3", "43,14": "grass_3", "43,15": "grass_3", "43,16": "grass_3", "43,17": "grass_3", "43,18": "grass_3", "43,19": "grass_3", "43,20": "grass_3", "43,21": "grass_3", "43,22": "grass_3", "43,23": "grass_3", "43,24": "grass_3", "43,25": "grass_3", "43,26": "grass_3", "43,27": "grass_3", "43,28": "grass_3", "43,29": "grass_3", "43,30": "grass_3", "43,31": "grass_3", "43,32": "grass_3", "43,33": "grass_3", "43,34": "grass_3", "43,35": "grass_3", "44,10": "grass_3", "44,11": "grass_3", "44,12": "grass_3", "44,13": "grass_3", "44,14": "grass_3", "44,15": "grass_3", "44,16": "grass_3", "44,17": "grass_3", "44,18": "grass_3", "44,19": "grass_3", "44,20": "grass_3", "44,21": "grass_3", "44,22": "grass_3", "44,23": "grass_3", "44,24": "grass_3", "44,25": "grass_3", "44,26": "grass_3", "44,27": "grass_3", "44,28": "grass_3", "44,29": "grass_3", "44,30": "grass_3", "44,31": "grass_3", "44,32": "grass_3", "44,33": "grass_3", "44,34": "grass_3", "44,35": "grass_3", "45,10": "grass_3", "45,11": "grass_3", "45,12": "grass_3", "45,13": "grass_3", "45,14": "grass_3", "45,15": "grass_3", "45,16": "grass_3", "45,17": "grass_3", "45,18": "grass_3", "45,19": "grass_3", "45,20": "grass_3", "45,21": "grass_3", "45,22": "grass_3", "45,23": "grass_3", "45,24": "grass_3", "45,25": "grass_3", "45,26": "grass_3", "45,27": "grass_3", "45,28": "grass_3", "45,29": "grass_3", "45,30": "grass_3", "45,31": "grass_3", "45,32": "grass_3", "45,33": "grass_3", "45,34": "grass_3", "45,35": "grass_3", "46,10": "grass_3", "46,11": "grass_3", "46,12": "grass_3", "46,13": "grass_3", "46,14": "grass_3", "46,15": "grass_3", "46,16": "grass_3", "46,17": "grass_3", "46,18": "grass_3", "46,19": "grass_3", "46,20": "grass_3", "46,21": "grass_3", "46,22": "grass_3", "46,23": "grass_3", "46,24": "grass_3", "46,25": "grass_3", "46,26": "grass_3", "46,27": "grass_3", "46,28": "grass_3", "46,29": "grass_3", "46,30": "grass_3", "46,31": "grass_3", "46,32": "grass_3", "46,33": "grass_3", "46,34": "grass_3", "46,35": "grass_3", "47,10": "grass_3", "47,11": "grass_3", "47,12": "grass_3", "47,13": "grass_3", "47,14": "grass_3", "47,15": "grass_3", "47,16": "grass_3", "47,17": "grass_3", "47,18": "grass_3", "47,19": "grass_3", "47,20": "grass_3", "47,21": "grass_3", "47,22": "grass_3", "47,23": "grass_3", "47,24": "grass_3", "47,25": "grass_3", "47,26": "grass_3", "47,27": "grass_3", "47,28": "grass_3", "47,29": "grass_3", "47,30": "grass_3", "47,31": "grass_3", "47,32": "grass_3", "47,33": "grass_3", "47,34": "grass_3", "47,35": "grass_3"}	[]	[]	[]	[]	[]	[]	[]	[]	auto	\N
user_space_12	leparkacc's Space	Personal	12	f	f	[]	2026-10-29 01:56:07.584246+00	2026-10-29 01:56:07.584246+00	{}	[]	[]	[]	[]	[]	[]	[]	[]	auto	\N
user_space_8	superadmin's Space	Personal	8	f	f	[]	2026-10-28 17:02:41.177978+00	2026-11-21 07:04:37.054498+00	{"freeform:deco_1795244676914_nvawo": "office_two/Copy (1) sprite-1-3|none::1074,864::passable::behind::layer:0"}	[]	[]	[]	[]	[]	[]	[]	[]	auto	\N
user_space_13	faiz's Space	Personal	13	f	f	[]	2026-10-29 10:09:48.176579+00	2026-10-29 10:09:48.176579+00	{}	[]	[]	[]	[]	[]	[]	[]	[]	auto	\N
space_restaurant	Restaurant	Hangout Lounges	8	t	t	[]	2026-11-21 12:17:23.76559+00	2026-11-22 08:53:50.656834+00	{"0,0": "grass_4", "0,1": "grass_4", "0,2": "grass_4", "0,3": "grass_4", "0,4": "grass_4", "0,5": "grass_4", "0,6": "grass_4", "0,7": "grass_4", "0,8": "grass_4", "0,9": "grass_4", "1,0": "wood_wall_8::obstacle", "1,1": "wood_wall_7::obstacle", "1,2": "wood_wall_7::obstacle", "1,3": "wood_wall_7::obstacle", "1,4": "wood_wall_7::obstacle", "1,5": "wood_wall_7::obstacle", "1,6": "wood_wall_7::obstacle", "1,7": "wood_wall_7::obstacle", "1,8": "wood_wall_7::obstacle", "1,9": "wood_wall_7::obstacle", "2,0": "wood_wall_8::obstacle", "2,1": "restaurant/rest_wall_kitchen::obstacle", "2,2": "restaurant/rest_floor_kitchen_quarry", "2,3": "restaurant/rest_floor_kitchen_quarry", "2,4": "restaurant/rest_floor_kitchen_quarry", "2,5": "restaurant/rest_floor_kitchen_quarry", "2,6": "restaurant/rest_floor_kitchen_quarry", "2,7": "restaurant/rest_floor_kitchen_quarry", "2,8": "restaurant/rest_floor_kitchen_quarry", "2,9": "restaurant/rest_floor_kitchen_quarry", "3,0": "wood_wall_8::obstacle", "3,1": "restaurant/rest_wall_kitchen::obstacle", "3,2": "restaurant/rest_floor_kitchen_quarry", "3,3": "restaurant/rest_floor_kitchen_quarry", "3,4": "restaurant/rest_floor_kitchen_quarry", "3,5": "restaurant/rest_floor_kitchen_quarry", "3,6": "restaurant/rest_floor_kitchen_quarry", "3,7": "restaurant/rest_floor_kitchen_quarry", "3,8": "restaurant/rest_floor_kitchen_quarry", "3,9": "restaurant/rest_floor_kitchen_quarry", "4,0": "wood_wall_8::obstacle", "4,1": "restaurant/rest_wall_kitchen::obstacle", "4,2": "restaurant/rest_floor_kitchen_quarry", "4,3": "restaurant/rest_floor_kitchen_quarry", "4,4": "restaurant/rest_floor_kitchen_quarry", "4,5": "restaurant/rest_floor_kitchen_quarry", "4,6": "restaurant/rest_floor_kitchen_quarry", "4,7": "restaurant/rest_floor_kitchen_quarry", "4,8": "restaurant/rest_floor_kitchen_quarry", "4,9": "restaurant/rest_floor_kitchen_quarry", "5,0": "wood_wall_8::obstacle", "5,1": "restaurant/rest_wall_kitchen::obstacle", "5,2": "restaurant/rest_floor_kitchen_quarry", "5,3": "restaurant/rest_floor_kitchen_quarry", "5,4": "restaurant/rest_floor_kitchen_quarry", "5,5": "restaurant/rest_floor_kitchen_quarry", "5,6": "restaurant/rest_floor_kitchen_quarry", "5,7": "restaurant/rest_floor_kitchen_quarry", "5,8": "restaurant/rest_floor_kitchen_quarry", "5,9": "restaurant/rest_floor_kitchen_quarry", "6,0": "wood_wall_8::obstacle", "6,1": "restaurant/rest_wall_kitchen::obstacle", "6,2": "restaurant/rest_floor_kitchen_quarry", "6,3": "restaurant/rest_floor_kitchen_quarry", "6,4": "restaurant/rest_floor_kitchen_quarry", "6,5": "restaurant/rest_floor_kitchen_quarry", "6,6": "restaurant/rest_floor_kitchen_quarry", "6,7": "restaurant/rest_floor_kitchen_quarry", "6,8": "restaurant/rest_floor_kitchen_quarry", "6,9": "restaurant/rest_floor_kitchen_quarry", "7,0": "wood_wall_8::obstacle", "7,1": "restaurant/rest_wall_kitchen::obstacle", "7,2": "restaurant/rest_floor_kitchen_quarry", "7,3": "restaurant/rest_floor_kitchen_quarry", "7,4": "restaurant/rest_floor_kitchen_quarry", "7,5": "restaurant/rest_floor_kitchen_quarry", "7,6": "restaurant/rest_floor_kitchen_quarry", "7,7": "restaurant/rest_floor_kitchen_quarry", "7,8": "restaurant/rest_floor_kitchen_quarry", "7,9": "restaurant/rest_floor_kitchen_quarry", "8,0": "wood_wall_8::obstacle", "8,1": "restaurant/rest_wall_kitchen::obstacle", "8,2": "restaurant/rest_floor_kitchen_quarry", "8,3": "restaurant/rest_floor_kitchen_quarry", "8,4": "restaurant/rest_floor_kitchen_quarry", "8,5": "restaurant/rest_floor_kitchen_quarry", "8,6": "restaurant/rest_floor_kitchen_quarry", "8,7": "restaurant/rest_floor_kitchen_quarry", "8,8": "restaurant/rest_floor_kitchen_quarry", "8,9": "restaurant/rest_floor_kitchen_quarry", "9,0": "wood_wall_8::obstacle", "9,1": "restaurant/rest_wall_kitchen::obstacle", "9,2": "restaurant/rest_floor_kitchen_quarry", "9,3": "restaurant/rest_floor_kitchen_quarry", "9,4": "restaurant/rest_floor_kitchen_quarry", "9,5": "restaurant/rest_floor_kitchen_quarry", "9,6": "restaurant/rest_floor_kitchen_quarry", "9,7": "restaurant/rest_floor_kitchen_quarry", "9,8": "restaurant/rest_floor_kitchen_quarry", "9,9": "restaurant/rest_floor_kitchen_quarry", "0,10": "grass_4", "0,11": "grass_4", "0,12": "grass_4", "0,13": "grass_4", "0,14": "grass_4", "0,15": "grass_4", "0,16": "grass_4", "0,17": "grass_4", "0,18": "grass_4", "0,19": "grass_4", "0,20": "grass_4", "0,21": "grass_4", "0,22": "grass_4", "0,23": "grass_4", "0,24": "grass_4", "0,25": "grass_4", "0,26": "grass_4", "0,27": "grass_4", "0,28": "grass_4", "0,29": "grass_4", "0,30": "grass_4", "0,31": "grass_4", "0,32": "grass_4", "0,33": "grass_4", "0,34": "grass_4", "0,35": "grass_4", "1,10": "wood_wall_7::obstacle", "1,11": "wood_wall_7::obstacle", "1,12": "wood_wall_7::obstacle", "1,13": "wood_wall_7::obstacle", "1,14": "wood_wall_7::obstacle", "1,15": "wood_wall_7::obstacle", "1,16": "wood_wall_7::obstacle", "1,17": "wood_wall_7::obstacle", "1,18": "wood_wall_7::obstacle", "1,19": "wood_wall_7::obstacle", "1,20": "wood_wall_7::obstacle", "1,21": "wood_wall_7::obstacle", "1,22": "wood_wall_7::obstacle", "1,23": "wood_wall_7::obstacle", "1,24": "wood_wall_7::obstacle", "1,25": "wood_wall_7::obstacle", "1,26": "wood_wall_7::obstacle", "1,27": "wood_wall_7::obstacle", "1,28": "wood_wall_7::obstacle", "1,29": "wood_wall_7::obstacle", "1,30": "wood_wall_7::obstacle", "1,31": "wood_wall_7::obstacle", "1,32": "grass_4", "1,33": "grass_4", "1,34": "grass_4", "1,35": "grass_4", "10,0": "wood_wall_8::obstacle", "10,1": "restaurant/rest_wall_kitchen::obstacle", "10,2": "restaurant/rest_floor_kitchen_quarry", "10,3": "restaurant/rest_floor_kitchen_quarry", "10,4": "restaurant/rest_floor_kitchen_quarry", "10,5": "restaurant/rest_floor_kitchen_quarry", "10,6": "restaurant/rest_floor_kitchen_quarry", "10,7": "restaurant/rest_floor_kitchen_quarry", "10,8": "restaurant/rest_floor_kitchen_quarry", "10,9": "restaurant/rest_floor_kitchen_quarry", "11,0": "wood_wall_8::obstacle", "11,1": "restaurant/rest_wall_kitchen::obstacle", "11,2": "restaurant/rest_floor_kitchen_quarry", "11,3": "restaurant/rest_floor_kitchen_quarry", "11,4": "restaurant/rest_floor_kitchen_quarry", "11,5": "restaurant/rest_floor_kitchen_quarry", "11,6": "restaurant/rest_floor_kitchen_quarry", "11,7": "restaurant/rest_floor_kitchen_quarry", "11,8": "restaurant/rest_floor_kitchen_quarry", "11,9": "restaurant/rest_floor_kitchen_quarry", "12,0": "wood_wall_8::obstacle", "12,1": "restaurant/rest_wall_kitchen::obstacle", "12,2": "restaurant/rest_floor_kitchen_quarry", "12,3": "restaurant/rest_floor_kitchen_quarry", "12,4": "restaurant/rest_floor_kitchen_quarry", "12,5": "restaurant/rest_floor_kitchen_quarry", "12,6": "restaurant/rest_floor_kitchen_quarry", "12,7": "restaurant/rest_floor_kitchen_quarry", "12,8": "restaurant/rest_floor_kitchen_quarry", "12,9": "restaurant/rest_floor_kitchen_quarry", "13,0": "wood_wall_8::obstacle", "13,1": "restaurant/rest_wall_kitchen::obstacle", "13,2": "restaurant/rest_floor_kitchen_quarry", "13,3": "restaurant/rest_floor_kitchen_quarry", "13,4": "restaurant/rest_floor_kitchen_quarry", "13,5": "restaurant/rest_floor_kitchen_quarry", "13,6": "restaurant/rest_floor_kitchen_quarry", "13,7": "restaurant/rest_floor_kitchen_quarry", "13,8": "restaurant/rest_floor_kitchen_quarry", "13,9": "restaurant/rest_floor_kitchen_quarry", "14,0": "wood_wall_8::obstacle", "14,1": "restaurant/rest_wall_kitchen::obstacle", "14,2": "restaurant/rest_floor_kitchen_quarry", "14,3": "restaurant/rest_floor_kitchen_quarry", "14,4": "restaurant/rest_floor_kitchen_quarry", "14,5": "restaurant/rest_floor_kitchen_quarry", "14,6": "restaurant/rest_floor_kitchen_quarry", "14,7": "restaurant/rest_floor_kitchen_quarry", "14,8": "restaurant/rest_floor_kitchen_quarry", "14,9": "restaurant/rest_floor_kitchen_quarry", "15,0": "wood_wall_8::obstacle", "15,1": "restaurant/rest_wall_kitchen::obstacle", "15,2": "restaurant/rest_floor_kitchen_quarry", "15,3": "restaurant/rest_floor_kitchen_quarry", "15,4": "restaurant/rest_floor_kitchen_quarry", "15,5": "restaurant/rest_floor_kitchen_quarry", "15,6": "restaurant/rest_floor_kitchen_quarry", "15,7": "restaurant/rest_floor_kitchen_quarry", "15,8": "restaurant/rest_floor_kitchen_quarry", "15,9": "restaurant/rest_floor_kitchen_quarry", "16,0": "wood_wall_8::obstacle", "16,1": "restaurant/rest_wall_kitchen::obstacle", "16,2": "restaurant/rest_floor_kitchen_quarry", "16,3": "restaurant/rest_floor_kitchen_quarry", "16,4": "restaurant/rest_floor_kitchen_quarry", "16,5": "restaurant/rest_floor_kitchen_quarry", "16,6": "restaurant/rest_floor_kitchen_quarry", "16,7": "restaurant/rest_floor_kitchen_quarry", "16,8": "restaurant/rest_floor_kitchen_quarry", "16,9": "restaurant/rest_floor_kitchen_quarry", "17,0": "wood_wall_8::obstacle", "17,1": "restaurant/rest_wall_kitchen::obstacle", "17,2": "restaurant/rest_floor_kitchen_quarry", "17,3": "restaurant/rest_floor_kitchen_quarry", "17,4": "restaurant/rest_floor_kitchen_quarry", "17,5": "restaurant/rest_floor_kitchen_quarry", "17,6": "restaurant/rest_floor_kitchen_quarry", "17,7": "restaurant/rest_floor_kitchen_quarry", "17,8": "restaurant/rest_floor_kitchen_quarry", "17,9": "restaurant/rest_floor_kitchen_quarry", "18,0": "wood_wall_8::obstacle", "18,1": "restaurant/rest_wall_kitchen::obstacle", "18,2": "restaurant/rest_floor_kitchen_quarry", "18,3": "restaurant/rest_floor_kitchen_quarry", "18,4": "restaurant/rest_floor_kitchen_quarry", "18,5": "restaurant/rest_floor_kitchen_quarry", "18,6": "restaurant/rest_floor_kitchen_quarry", "18,7": "restaurant/rest_floor_kitchen_quarry", "18,8": "restaurant/rest_floor_kitchen_quarry", "18,9": "restaurant/rest_floor_kitchen_quarry", "19,0": "wood_wall_8::obstacle", "19,1": "restaurant/rest_wall_kitchen::obstacle", "19,2": "restaurant/rest_floor_kitchen_quarry", "19,3": "restaurant/rest_floor_kitchen_quarry", "19,4": "restaurant/rest_floor_kitchen_quarry", "19,5": "restaurant/rest_floor_kitchen_quarry", "19,6": "restaurant/rest_floor_kitchen_quarry", "19,7": "restaurant/rest_floor_kitchen_quarry", "19,8": "restaurant/rest_floor_kitchen_quarry", "19,9": "restaurant/rest_floor_kitchen_quarry", "2,10": "restaurant/rest_floor_kitchen_quarry", "2,11": "restaurant/rest_floor_kitchen_quarry", "2,12": "restaurant/rest_wall_bistro::obstacle", "2,13": "wood_4", "2,14": "wood_4", "2,15": "wood_4", "2,16": "wood_4", "2,17": "wood_4", "2,18": "wood_4", "2,19": "wood_4", "2,20": "wood_4", "2,21": "wood_4", "2,22": "wood_4", "2,23": "wood_4", "2,24": "wood_4", "2,25": "wood_4", "2,26": "wood_4", "2,27": "wood_4", "2,28": "wood_4", "2,29": "wood_4", "2,30": "wood_wall_8::obstacle", "2,31": "restaurant/rest_wall_bistro::obstacle", "2,32": "grass_4", "2,33": "grass_4", "2,34": "grass_4", "2,35": "grass_4", "20,0": "wood_wall_8::obstacle", "20,1": "restaurant/rest_wall_kitchen::obstacle", "20,2": "restaurant/rest_floor_kitchen_quarry", "20,3": "restaurant/rest_floor_kitchen_quarry", "20,4": "restaurant/rest_floor_kitchen_quarry", "20,5": "restaurant/rest_floor_kitchen_quarry", "20,6": "restaurant/rest_floor_kitchen_quarry", "20,7": "restaurant/rest_floor_kitchen_quarry", "20,8": "restaurant/rest_floor_kitchen_quarry", "20,9": "restaurant/rest_floor_kitchen_quarry", "21,0": "wood_wall_8::obstacle", "21,1": "restaurant/rest_wall_kitchen::obstacle", "21,2": "restaurant/rest_floor_kitchen_quarry", "21,3": "restaurant/rest_floor_kitchen_quarry", "21,4": "restaurant/rest_floor_kitchen_quarry", "21,5": "restaurant/rest_floor_kitchen_quarry", "21,6": "restaurant/rest_floor_kitchen_quarry", "21,7": "restaurant/rest_floor_kitchen_quarry", "21,8": "restaurant/rest_floor_kitchen_quarry", "21,9": "restaurant/rest_floor_kitchen_quarry", "22,0": "wood_wall_8::obstacle", "22,1": "restaurant/rest_wall_kitchen::obstacle", "22,2": "restaurant/rest_floor_kitchen_quarry", "22,3": "restaurant/rest_floor_kitchen_quarry", "22,4": "restaurant/rest_floor_kitchen_quarry", "22,5": "restaurant/rest_floor_kitchen_quarry", "22,6": "restaurant/rest_floor_kitchen_quarry", "22,7": "restaurant/rest_floor_kitchen_quarry", "22,8": "restaurant/rest_floor_kitchen_quarry", "22,9": "restaurant/rest_floor_kitchen_quarry", "23,0": "wood_wall_8::obstacle", "23,1": "restaurant/rest_wall_kitchen::obstacle", "23,2": "restaurant/rest_floor_kitchen_quarry", "23,3": "restaurant/rest_floor_kitchen_quarry", "23,4": "restaurant/rest_floor_kitchen_quarry", "23,5": "restaurant/rest_floor_kitchen_quarry", "23,6": "restaurant/rest_floor_kitchen_quarry", "23,7": "restaurant/rest_floor_kitchen_quarry", "23,8": "restaurant/rest_floor_kitchen_quarry", "23,9": "restaurant/rest_floor_kitchen_quarry", "24,0": "wood_wall_8::obstacle", "24,1": "restaurant/rest_wall_kitchen::obstacle", "24,2": "restaurant/rest_floor_kitchen_quarry", "24,3": "restaurant/rest_floor_kitchen_quarry", "24,4": "restaurant/rest_floor_kitchen_quarry", "24,5": "restaurant/rest_floor_kitchen_quarry", "24,6": "restaurant/rest_floor_kitchen_quarry", "24,7": "restaurant/rest_floor_kitchen_quarry", "24,8": "restaurant/rest_floor_kitchen_quarry", "24,9": "restaurant/rest_floor_kitchen_quarry", "25,0": "wood_wall_8::obstacle", "25,1": "restaurant/rest_wall_kitchen::obstacle", "25,2": "restaurant/rest_floor_kitchen_quarry", "25,3": "restaurant/rest_floor_kitchen_quarry", "25,4": "restaurant/rest_floor_kitchen_quarry", "25,5": "restaurant/rest_floor_kitchen_quarry", "25,6": "restaurant/rest_floor_kitchen_quarry", "25,7": "restaurant/rest_floor_kitchen_quarry", "25,8": "restaurant/rest_floor_kitchen_quarry", "25,9": "restaurant/rest_floor_kitchen_quarry", "26,0": "wood_wall_8::obstacle", "26,1": "restaurant/rest_wall_kitchen::obstacle", "26,2": "restaurant/rest_floor_kitchen_quarry", "26,3": "restaurant/rest_floor_kitchen_quarry", "26,4": "restaurant/rest_floor_kitchen_quarry", "26,5": "restaurant/rest_floor_kitchen_quarry", "26,6": "restaurant/rest_floor_kitchen_quarry", "26,7": "restaurant/rest_floor_kitchen_quarry", "26,8": "restaurant/rest_floor_kitchen_quarry", "26,9": "restaurant/rest_floor_kitchen_quarry", "27,0": "wood_wall_8::obstacle", "27,1": "restaurant/rest_wall_kitchen::obstacle", "27,2": "restaurant/rest_floor_kitchen_quarry", "27,3": "restaurant/rest_floor_kitchen_quarry", "27,4": "restaurant/rest_floor_kitchen_quarry", "27,5": "restaurant/rest_floor_kitchen_quarry", "27,6": "restaurant/rest_floor_kitchen_quarry", "27,7": "restaurant/rest_floor_kitchen_quarry", "27,8": "restaurant/rest_floor_kitchen_quarry", "27,9": "restaurant/rest_floor_kitchen_quarry", "28,0": "wood_wall_8::obstacle", "28,1": "restaurant/rest_wall_kitchen::obstacle", "28,2": "restaurant/rest_floor_kitchen_quarry", "28,3": "restaurant/rest_floor_kitchen_quarry", "28,4": "restaurant/rest_floor_kitchen_quarry", "28,5": "restaurant/rest_floor_kitchen_quarry", "28,6": "restaurant/rest_floor_kitchen_quarry", "28,7": "restaurant/rest_floor_kitchen_quarry", "28,8": "restaurant/rest_floor_kitchen_quarry", "28,9": "restaurant/rest_floor_kitchen_quarry", "29,0": "wood_wall_8::obstacle", "29,1": "restaurant/rest_wall_kitchen::obstacle", "29,2": "restaurant/rest_floor_kitchen_quarry", "29,3": "restaurant/rest_floor_kitchen_quarry", "29,4": "restaurant/rest_floor_kitchen_quarry", "29,5": "restaurant/rest_floor_kitchen_quarry", "29,6": "restaurant/rest_floor_kitchen_quarry", "29,7": "restaurant/rest_floor_kitchen_quarry", "29,8": "restaurant/rest_floor_kitchen_quarry", "29,9": "restaurant/rest_floor_kitchen_quarry", "3,10": "restaurant/rest_floor_kitchen_quarry", "3,11": "restaurant/rest_floor_kitchen_quarry", "3,12": "restaurant/rest_wall_bistro::obstacle", "3,13": "wood_4", "3,14": "wood_4", "3,15": "wood_4", "3,16": "wood_4", "3,17": "wood_4", "3,18": "wood_4", "3,19": "wood_4", "3,20": "wood_4", "3,21": "wood_4", "3,22": "wood_4", "3,23": "wood_4", "3,24": "wood_4", "3,25": "wood_4", "3,26": "wood_4", "3,27": "wood_4", "3,28": "wood_4", "3,29": "wood_4", "3,30": "wood_wall_8::obstacle", "3,31": "restaurant/rest_wall_bistro::obstacle", "3,32": "grass_4", "3,33": "grass_4", "3,34": "grass_4", "3,35": "grass_4", "30,0": "wood_wall_8::obstacle", "30,1": "restaurant/rest_wall_kitchen::obstacle", "30,2": "restaurant/rest_floor_kitchen_quarry", "30,3": "restaurant/rest_floor_kitchen_quarry", "30,4": "restaurant/rest_floor_kitchen_quarry", "30,5": "restaurant/rest_floor_kitchen_quarry", "30,6": "restaurant/rest_floor_kitchen_quarry", "30,7": "restaurant/rest_floor_kitchen_quarry", "30,8": "restaurant/rest_floor_kitchen_quarry", "30,9": "restaurant/rest_floor_kitchen_quarry", "31,0": "wood_wall_8::obstacle", "31,1": "restaurant/rest_wall_kitchen::obstacle", "31,2": "restaurant/rest_floor_kitchen_quarry", "31,3": "restaurant/rest_floor_kitchen_quarry", "31,4": "restaurant/rest_floor_kitchen_quarry", "31,5": "restaurant/rest_floor_kitchen_quarry", "31,6": "restaurant/rest_floor_kitchen_quarry", "31,7": "restaurant/rest_floor_kitchen_quarry", "31,8": "restaurant/rest_floor_kitchen_quarry", "31,9": "restaurant/rest_floor_kitchen_quarry", "32,0": "wood_wall_8::obstacle", "32,1": "restaurant/rest_wall_kitchen::obstacle", "32,2": "restaurant/rest_floor_kitchen_quarry", "32,3": "restaurant/rest_floor_kitchen_quarry", "32,4": "restaurant/rest_floor_kitchen_quarry", "32,5": "restaurant/rest_floor_kitchen_quarry", "32,6": "restaurant/rest_floor_kitchen_quarry", "32,7": "restaurant/rest_floor_kitchen_quarry", "32,8": "restaurant/rest_floor_kitchen_quarry", "32,9": "restaurant/rest_floor_kitchen_quarry", "33,0": "wood_wall_8::obstacle", "33,1": "wood_wall_7::obstacle", "33,2": "wood_wall_7::obstacle", "33,3": "wood_wall_7::obstacle", "33,4": "wood_wall_7::obstacle", "33,5": "wood_wall_7::obstacle", "33,6": "marble_3", "33,7": "marble_3", "33,8": "wood_wall_7::obstacle", "33,9": "wood_wall_7::obstacle", "34,0": "wood_wall_8::obstacle", "34,1": "wood_wall_3::obstacle", "34,2": "marble_3", "34,3": "marble_3", "34,4": "marble_3", "34,5": "marble_3", "34,6": "marble_3", "34,7": "marble_3", "34,8": "marble_3", "34,9": "marble_3", "35,0": "wood_wall_8::obstacle", "35,1": "wood_wall_3::obstacle", "35,2": "marble_3", "35,3": "marble_3", "35,4": "marble_3", "35,5": "marble_3", "35,6": "marble_3", "35,7": "marble_3", "35,8": "marble_3", "35,9": "marble_3", "36,0": "wood_wall_8::obstacle", "36,1": "wood_wall_3::obstacle", "36,2": "marble_3", "36,3": "marble_3", "36,4": "marble_3", "36,5": "marble_3", "36,6": "marble_3", "36,7": "marble_3", "36,8": "marble_3", "36,9": "marble_3", "37,0": "marble_3", "37,1": "marble_3", "37,2": "marble_3", "37,3": "marble_3", "37,4": "marble_3", "37,5": "marble_3", "37,6": "marble_3", "37,7": "marble_3", "37,8": "marble_3", "37,9": "marble_3", "38,0": "marble_3", "38,1": "marble_3", "38,2": "marble_3", "38,3": "marble_3", "38,4": "marble_3", "38,5": "marble_3", "38,6": "marble_3", "38,7": "marble_3", "38,8": "marble_3", "38,9": "marble_3", "39,0": "marble_3", "39,1": "marble_3", "39,2": "marble_3", "39,3": "marble_3", "39,4": "marble_3", "39,5": "marble_3", "39,6": "marble_3", "39,7": "marble_3", "39,8": "marble_3", "39,9": "marble_3", "4,10": "restaurant/rest_floor_kitchen_quarry", "4,11": "restaurant/rest_floor_kitchen_quarry", "4,12": "restaurant/rest_wall_bistro::obstacle", "4,13": "wood_4", "4,14": "wood_4", "4,15": "wood_4", "4,16": "wood_4", "4,17": "wood_4", "4,18": "wood_4", "4,19": "wood_4", "4,20": "wood_4", "4,21": "wood_4", "4,22": "wood_4", "4,23": "wood_4", "4,24": "wood_4", "4,25": "wood_4", "4,26": "wood_4", "4,27": "wood_4", "4,28": "wood_4", "4,29": "wood_4", "4,30": "wood_wall_8::obstacle", "4,31": "restaurant/rest_wall_awning_window::obstacle", "4,32": "grass_4", "4,33": "grass_4", "4,34": "grass_4", "4,35": "grass_4", "40,0": "marble_3", "40,1": "marble_3", "40,2": "marble_3", "40,3": "marble_3", "40,4": "marble_3", "40,5": "marble_3", "40,6": "marble_3", "40,7": "marble_3", "40,8": "marble_3", "40,9": "marble_3", "41,0": "wood_wall_8::obstacle", "41,1": "wood_wall_3::obstacle", "41,2": "marble_3", "41,3": "marble_3", "41,4": "marble_3", "41,5": "marble_3", "41,6": "marble_3", "41,7": "marble_3", "41,8": "marble_3", "41,9": "marble_3", "42,0": "wood_wall_8::obstacle", "42,1": "wood_wall_3::obstacle", "42,2": "marble_3", "42,3": "marble_3", "42,4": "marble_3", "42,5": "marble_3", "42,6": "marble_3", "42,7": "marble_3", "42,8": "marble_3", "42,9": "marble_3", "43,0": "wood_wall_8::obstacle", "43,1": "wood_wall_3::obstacle", "43,2": "marble_3", "43,3": "marble_3", "43,4": "marble_3", "43,5": "marble_3", "43,6": "marble_3", "43,7": "marble_3", "43,8": "marble_3", "43,9": "marble_3", "44,0": "wood_wall_8::obstacle", "44,1": "wood_wall_3::obstacle", "44,2": "marble_3", "44,3": "marble_3", "44,4": "marble_3", "44,5": "marble_3", "44,6": "marble_3", "44,7": "marble_3", "44,8": "marble_3", "44,9": "marble_3", "45,0": "wood_wall_8::obstacle", "45,1": "wood_wall_3::obstacle", "45,2": "marble_3", "45,3": "marble_3", "45,4": "marble_3", "45,5": "marble_3", "45,6": "marble_3", "45,7": "marble_3", "45,8": "marble_3", "45,9": "marble_3", "46,0": "wood_wall_8::obstacle", "46,1": "wood_wall_7::obstacle", "46,2": "wood_wall_7::obstacle", "46,3": "wood_wall_7::obstacle", "46,4": "wood_wall_7::obstacle", "46,5": "wood_wall_7::obstacle", "46,6": "wood_wall_7::obstacle", "46,7": "wood_wall_7::obstacle", "46,8": "wood_wall_7::obstacle", "46,9": "wood_wall_7::obstacle", "47,0": "grass_4", "47,1": "grass_4", "47,2": "grass_4", "47,3": "grass_4", "47,4": "grass_4", "47,5": "grass_4", "47,6": "grass_4", "47,7": "grass_4", "47,8": "grass_4", "47,9": "grass_4", "5,10": "restaurant/rest_floor_kitchen_quarry", "5,11": "restaurant/rest_floor_kitchen_quarry", "5,12": "restaurant/rest_wall_bistro::obstacle", "5,13": "wood_4", "5,14": "wood_4", "5,15": "wood_4", "5,16": "wood_4", "5,17": "wood_4", "5,18": "wood_4", "5,19": "wood_4", "5,20": "wood_4", "5,21": "wood_4", "5,22": "wood_4", "5,23": "wood_4", "5,24": "wood_4", "5,25": "wood_4", "5,26": "wood_4", "5,27": "wood_4", "5,28": "wood_4", "5,29": "wood_4", "5,30": "wood_wall_8::obstacle", "5,31": "restaurant/rest_wall_awning_window::obstacle", "5,32": "grass_4", "5,33": "grass_4", "5,34": "grass_4", "5,35": "grass_4", "6,10": "restaurant/rest_floor_kitchen_quarry", "6,11": "restaurant/rest_floor_kitchen_quarry", "6,12": "restaurant/rest_wall_bistro::obstacle", "6,13": "wood_4", "6,14": "wood_4", "6,15": "wood_4", "6,16": "wood_4", "6,17": "wood_4", "6,18": "wood_4", "6,19": "wood_4", "6,20": "wood_4", "6,21": "wood_4", "6,22": "wood_4", "6,23": "wood_4", "6,24": "wood_4", "6,25": "wood_4", "6,26": "wood_4", "6,27": "wood_4", "6,28": "wood_4", "6,29": "wood_4", "6,30": "wood_wall_8::obstacle", "6,31": "restaurant/rest_wall_bistro::obstacle", "6,32": "stone_5", "6,33": "stone_5", "6,34": "stone_5", "6,35": "stone_5", "7,10": "restaurant/rest_floor_kitchen_quarry", "7,11": "restaurant/rest_floor_kitchen_quarry", "7,12": "restaurant/rest_floor_kitchen_quarry", "7,13": "wood_4", "7,14": "wood_4", "7,15": "wood_4", "7,16": "wood_4", "7,17": "wood_4", "7,18": "wood_4", "7,19": "wood_4", "7,20": "wood_4", "7,21": "wood_4", "7,22": "wood_4", "7,23": "wood_4", "7,24": "wood_4", "7,25": "wood_4", "7,26": "wood_4", "7,27": "wood_4", "7,28": "wood_4", "7,29": "wood_4", "7,30": "wood_wall_8::obstacle", "7,31": "restaurant/rest_wall_bistro::obstacle", "7,32": "stone_5", "7,33": "stone_5", "7,34": "stone_5", "7,35": "stone_5", "8,10": "restaurant/rest_floor_kitchen_quarry", "8,11": "restaurant/rest_floor_kitchen_quarry", "8,12": "restaurant/rest_floor_kitchen_quarry", "8,13": "wood_4", "8,14": "wood_4", "8,15": "wood_4", "8,16": "wood_4", "8,17": "wood_4", "8,18": "wood_4", "8,19": "wood_4", "8,20": "wood_4", "8,21": "wood_4", "8,22": "wood_4", "8,23": "wood_4", "8,24": "wood_4", "8,25": "wood_4", "8,26": "wood_4", "8,27": "wood_4", "8,28": "wood_4", "8,29": "wood_4", "8,30": "wood_wall_8::obstacle", "8,31": "restaurant/rest_wall_awning_window::obstacle", "8,32": "stone_5", "8,33": "stone_5", "8,34": "stone_5", "8,35": "stone_5", "9,10": "restaurant/rest_floor_kitchen_quarry", "9,11": "restaurant/rest_floor_kitchen_quarry", "9,12": "restaurant/rest_wall_bistro::obstacle", "9,13": "wood_4", "9,14": "wood_4", "9,15": "wood_4", "9,16": "wood_4", "9,17": "wood_4", "9,18": "wood_4", "9,19": "wood_4", "9,20": "wood_4", "9,21": "wood_4", "9,22": "wood_4", "9,23": "wood_4", "9,24": "wood_4", "9,25": "wood_4", "9,26": "wood_4", "9,27": "wood_4", "9,28": "wood_4", "9,29": "wood_4", "9,30": "wood_wall_8::obstacle", "9,31": "restaurant/rest_wall_awning_window::obstacle", "9,32": "stone_5", "9,33": "stone_5", "9,34": "stone_5", "9,35": "stone_5", "10,10": "restaurant/rest_floor_kitchen_quarry", "10,11": "restaurant/rest_floor_kitchen_quarry", "10,12": "restaurant/rest_wall_bistro::obstacle", "10,13": "wood_4", "10,14": "wood_4", "10,15": "wood_4", "10,16": "wood_4", "10,17": "wood_4", "10,18": "wood_4", "10,19": "wood_4", "10,20": "wood_4", "10,21": "wood_4", "10,22": "wood_4", "10,23": "wood_4", "10,24": "wood_4", "10,25": "wood_4", "10,26": "wood_4", "10,27": "wood_4", "10,28": "wood_4", "10,29": "wood_4", "10,30": "wood_wall_8::obstacle", "10,31": "restaurant/rest_wall_bistro::obstacle", "10,32": "stone_5", "10,33": "stone_5", "10,34": "stone_5", "10,35": "stone_5", "11,10": "restaurant/rest_floor_kitchen_quarry", "11,11": "restaurant/rest_floor_kitchen_quarry", "11,12": "restaurant/rest_wall_bistro::obstacle", "11,13": "wood_4", "11,14": "wood_4", "11,15": "wood_4", "11,16": "wood_4", "11,17": "wood_4", "11,18": "wood_4", "11,19": "wood_4", "11,20": "wood_4", "11,21": "wood_4", "11,22": "wood_4", "11,23": "wood_4", "11,24": "wood_4", "11,25": "wood_4", "11,26": "wood_4", "11,27": "wood_4", "11,28": "wood_4", "11,29": "wood_4", "11,30": "wood_wall_8::obstacle", "11,31": "restaurant/rest_wall_bistro::obstacle", "11,32": "stone_5", "11,33": "stone_5", "11,34": "stone_5", "11,35": "stone_5", "12,10": "restaurant/rest_floor_kitchen_quarry", "12,11": "restaurant/rest_floor_kitchen_quarry", "12,12": "wood_4", "12,13": "wood_4", "12,14": "wood_4", "12,15": "wood_4", "12,16": "wood_4", "12,17": "wood_4", "12,18": "wood_4", "12,19": "wood_4", "12,20": "wood_4", "12,21": "wood_4", "12,22": "wood_4", "12,23": "wood_4", "12,24": "wood_4", "12,25": "wood_4", "12,26": "wood_4", "12,27": "wood_4", "12,28": "wood_4", "12,29": "wood_4", "12,30": "wood_wall_8::obstacle", "12,31": "restaurant/rest_wall_awning_window::obstacle", "12,32": "stone_5", "12,33": "stone_5", "12,34": "stone_5", "12,35": "stone_5", "13,10": "restaurant/rest_floor_kitchen_quarry", "13,11": "restaurant/rest_floor_kitchen_quarry", "13,12": "wood_4", "13,13": "wood_4", "13,14": "wood_4", "13,15": "wood_4", "13,16": "wood_4", "13,17": "wood_4", "13,18": "wood_4", "13,19": "wood_4", "13,20": "wood_4", "13,21": "wood_4", "13,22": "wood_4", "13,23": "wood_4", "13,24": "wood_4", "13,25": "wood_4", "13,26": "wood_4", "13,27": "wood_4", "13,28": "wood_4", "13,29": "wood_4", "13,30": "wood_wall_8::obstacle", "13,31": "restaurant/rest_wall_awning_window::obstacle", "13,32": "stone_5", "13,33": "stone_5", "13,34": "stone_5", "13,35": "stone_5", "14,10": "restaurant/rest_floor_kitchen_quarry", "14,11": "restaurant/rest_floor_kitchen_quarry", "14,12": "wood_4", "14,13": "wood_4", "14,14": "wood_4", "14,15": "wood_4", "14,16": "wood_4", "14,17": "wood_4", "14,18": "wood_4", "14,19": "wood_4", "14,20": "wood_4", "14,21": "wood_4", "14,22": "wood_4", "14,23": "wood_4", "14,24": "wood_4", "14,25": "wood_4", "14,26": "wood_4", "14,27": "wood_4", "14,28": "wood_4", "14,29": "wood_4", "14,30": "wood_wall_8::obstacle", "14,31": "restaurant/rest_wall_bistro::obstacle", "14,32": "stone_5", "14,33": "stone_5", "14,34": "stone_5", "14,35": "stone_5", "15,10": "restaurant/rest_floor_kitchen_quarry", "15,11": "restaurant/rest_floor_kitchen_quarry", "15,12": "wood_4", "15,13": "wood_4", "15,14": "wood_4", "15,15": "wood_4", "15,16": "wood_4", "15,17": "wood_4", "15,18": "wood_4", "15,19": "wood_4", "15,20": "wood_4", "15,21": "wood_4", "15,22": "wood_4", "15,23": "wood_4", "15,24": "wood_4", "15,25": "wood_4", "15,26": "wood_4", "15,27": "wood_4", "15,28": "wood_4", "15,29": "wood_4", "15,30": "wood_wall_8::obstacle", "15,31": "restaurant/rest_wall_bistro::obstacle", "15,32": "stone_5", "15,33": "stone_5", "15,34": "stone_5", "15,35": "stone_5", "16,10": "restaurant/rest_floor_kitchen_quarry", "16,11": "restaurant/rest_floor_kitchen_quarry", "16,12": "wood_4", "16,13": "wood_4", "16,14": "wood_4", "16,15": "wood_4", "16,16": "wood_4", "16,17": "wood_4", "16,18": "wood_4", "16,19": "wood_4", "16,20": "wood_4", "16,21": "wood_4", "16,22": "wood_4", "16,23": "wood_4", "16,24": "wood_4", "16,25": "wood_4", "16,26": "wood_4", "16,27": "wood_4", "16,28": "wood_4", "16,29": "wood_4", "16,30": "wood_wall_8::obstacle", "16,31": "restaurant/rest_wall_awning_window::obstacle", "16,32": "stone_5", "16,33": "stone_5", "16,34": "stone_5", "16,35": "stone_5", "17,10": "restaurant/rest_floor_kitchen_quarry", "17,11": "restaurant/rest_floor_kitchen_quarry", "17,12": "wood_4", "17,13": "wood_4", "17,14": "wood_4", "17,15": "wood_4", "17,16": "wood_4", "17,17": "wood_4", "17,18": "wood_4", "17,19": "wood_4", "17,20": "wood_4", "17,21": "wood_4", "17,22": "wood_4", "17,23": "wood_4", "17,24": "wood_4", "17,25": "wood_4", "17,26": "wood_4", "17,27": "wood_4", "17,28": "wood_4", "17,29": "wood_4", "17,30": "wood_wall_8::obstacle", "17,31": "restaurant/rest_wall_awning_window::obstacle", "17,32": "stone_5", "17,33": "stone_5", "17,34": "stone_5", "17,35": "stone_5", "18,10": "restaurant/rest_floor_kitchen_quarry", "18,11": "restaurant/rest_floor_kitchen_quarry", "18,12": "wood_4", "18,13": "wood_4", "18,14": "wood_4", "18,15": "wood_4", "18,16": "wood_4", "18,17": "wood_4", "18,18": "wood_4", "18,19": "wood_4", "18,20": "wood_4", "18,21": "wood_4", "18,22": "wood_4", "18,23": "wood_4", "18,24": "wood_4", "18,25": "wood_4", "18,26": "wood_4", "18,27": "wood_4", "18,28": "wood_4", "18,29": "wood_4", "18,30": "wood_wall_8::obstacle", "18,31": "restaurant/rest_wall_bistro::obstacle", "18,32": "stone_5", "18,33": "stone_5", "18,34": "stone_5", "18,35": "stone_5", "19,10": "restaurant/rest_floor_kitchen_quarry", "19,11": "restaurant/rest_floor_kitchen_quarry", "19,12": "wood_4", "19,13": "wood_4", "19,14": "wood_4", "19,15": "wood_4", "19,16": "wood_4", "19,17": "wood_4", "19,18": "wood_4", "19,19": "wood_4", "19,20": "wood_4", "19,21": "wood_4", "19,22": "wood_4", "19,23": "wood_4", "19,24": "wood_4", "19,25": "wood_4", "19,26": "wood_4", "19,27": "wood_4", "19,28": "wood_4", "19,29": "wood_4", "19,30": "wood_wall_8::obstacle", "19,31": "restaurant/rest_wall_awning_window::obstacle", "19,32": "stone_5", "19,33": "stone_5", "19,34": "stone_5", "19,35": "stone_5", "20,10": "restaurant/rest_floor_kitchen_quarry", "20,11": "restaurant/rest_floor_kitchen_quarry", "20,12": "wood_4", "20,13": "wood_4", "20,14": "wood_4", "20,15": "wood_4", "20,16": "wood_4", "20,17": "wood_4", "20,18": "wood_4", "20,19": "wood_4", "20,20": "wood_4", "20,21": "wood_4", "20,22": "wood_4", "20,23": "wood_4", "20,24": "wood_4", "20,25": "wood_4", "20,26": "wood_4", "20,27": "wood_4", "20,28": "wood_4", "20,29": "wood_4", "20,30": "wood_wall_8::obstacle", "20,31": "restaurant/rest_wall_bistro::obstacle", "20,32": "stone_5", "20,33": "stone_5", "20,34": "stone_5", "20,35": "stone_5", "21,10": "restaurant/rest_floor_kitchen_quarry", "21,11": "restaurant/rest_floor_kitchen_quarry", "21,12": "restaurant/rest_wall_bistro::obstacle", "21,13": "wood_4", "21,14": "wood_4", "21,15": "wood_4", "21,16": "wood_4", "21,17": "wood_4", "21,18": "wood_4", "21,19": "wood_4", "21,20": "wood_4", "21,21": "wood_4", "21,22": "wood_4", "21,23": "wood_4", "21,24": "wood_4", "21,25": "wood_4", "21,26": "wood_4", "21,27": "wood_4", "21,28": "wood_4", "21,29": "wood_4", "21,30": "wood_wall_8::obstacle", "21,31": "restaurant/rest_wall_bistro::obstacle", "21,32": "stone_2", "21,33": "stone_2", "21,34": "stone_2", "21,35": "stone_2", "22,10": "restaurant/rest_floor_kitchen_quarry", "22,11": "restaurant/rest_floor_kitchen_quarry", "22,12": "restaurant/rest_wall_bistro::obstacle", "22,13": "wood_4", "22,14": "wood_4", "22,15": "wood_4", "22,16": "wood_4", "22,17": "wood_4", "22,18": "wood_4", "22,19": "wood_4", "22,20": "wood_4", "22,21": "wood_4", "22,22": "wood_4", "22,23": "wood_4", "22,24": "wood_4", "22,25": "wood_4", "22,26": "wood_4", "22,27": "wood_4", "22,28": "wood_4", "22,29": "wood_4", "22,30": "marble_2", "22,31": "marble_2", "22,32": "stone_2", "22,33": "stone_2", "22,34": "stone_2", "22,35": "stone_2", "23,10": "restaurant/rest_floor_kitchen_quarry", "23,11": "restaurant/rest_floor_kitchen_quarry", "23,12": "wood_4", "23,13": "wood_4", "23,14": "wood_4", "23,15": "wood_4", "23,16": "wood_4", "23,17": "wood_4", "23,18": "wood_4", "23,19": "wood_4", "23,20": "wood_4", "23,21": "wood_4", "23,22": "wood_4", "23,23": "wood_4", "23,24": "wood_4", "23,25": "wood_4", "23,26": "wood_4", "23,27": "wood_4", "23,28": "wood_4", "23,29": "wood_4", "23,30": "marble_2", "23,31": "marble_2", "23,32": "stone_2", "23,33": "stone_2", "23,34": "stone_2", "23,35": "stone_2", "24,10": "restaurant/rest_floor_kitchen_quarry", "24,11": "restaurant/rest_floor_kitchen_quarry", "24,12": "wood_4", "24,13": "wood_4", "24,14": "wood_4", "24,15": "wood_4", "24,16": "wood_4", "24,17": "wood_4", "24,18": "wood_4", "24,19": "wood_4", "24,20": "wood_4", "24,21": "wood_4", "24,22": "wood_4", "24,23": "wood_4", "24,24": "wood_4", "24,25": "wood_4", "24,26": "wood_4", "24,27": "wood_4", "24,28": "wood_4", "24,29": "wood_4", "24,30": "marble_2", "24,31": "marble_2", "24,32": "stone_2", "24,33": "stone_2", "24,34": "stone_2", "24,35": "stone_2", "25,10": "restaurant/rest_floor_kitchen_quarry", "25,11": "restaurant/rest_floor_kitchen_quarry", "25,12": "restaurant/rest_wall_bistro::obstacle", "25,13": "wood_4", "25,14": "wood_4", "25,15": "wood_4", "25,16": "wood_4", "25,17": "wood_4", "25,18": "wood_4", "25,19": "wood_4", "25,20": "wood_4", "25,21": "wood_4", "25,22": "wood_4", "25,23": "wood_4", "25,24": "wood_4", "25,25": "wood_4", "25,26": "wood_4", "25,27": "wood_4", "25,28": "wood_4", "25,29": "wood_4", "25,30": "marble_2", "25,31": "marble_2", "25,32": "stone_2", "25,33": "stone_2", "25,34": "stone_2", "25,35": "stone_2", "26,10": "restaurant/rest_floor_kitchen_quarry", "26,11": "restaurant/rest_floor_kitchen_quarry", "26,12": "restaurant/rest_wall_bistro::obstacle", "26,13": "wood_4", "26,14": "wood_4", "26,15": "wood_4", "26,16": "wood_4", "26,17": "wood_4", "26,18": "wood_4", "26,19": "wood_4", "26,20": "wood_4", "26,21": "wood_4", "26,22": "wood_4", "26,23": "wood_4", "26,24": "wood_4", "26,25": "wood_4", "26,26": "wood_4", "26,27": "wood_4", "26,28": "wood_4", "26,29": "wood_4", "26,30": "wood_wall_8::obstacle", "26,31": "restaurant/rest_wall_bistro::obstacle", "26,32": "stone_2", "26,33": "stone_2", "26,34": "stone_2", "26,35": "stone_2", "27,10": "restaurant/rest_floor_kitchen_quarry", "27,11": "restaurant/rest_floor_kitchen_quarry", "27,12": "restaurant/rest_wall_bistro::obstacle", "27,13": "wood_4", "27,14": "wood_4", "27,15": "wood_4", "27,16": "wood_4", "27,17": "wood_4", "27,18": "wood_4", "27,19": "wood_4", "27,20": "wood_4", "27,21": "wood_4", "27,22": "wood_4", "27,23": "wood_4", "27,24": "wood_4", "27,25": "wood_4", "27,26": "wood_4", "27,27": "wood_4", "27,28": "wood_4", "27,29": "wood_4", "27,30": "wood_wall_8::obstacle", "27,31": "restaurant/rest_wall_bistro::obstacle", "27,32": "stone_5", "27,33": "stone_5", "27,34": "stone_5", "27,35": "stone_5", "28,10": "restaurant/rest_floor_kitchen_quarry", "28,11": "restaurant/rest_floor_kitchen_quarry", "28,12": "restaurant/rest_wall_bistro::obstacle", "28,13": "wood_4", "28,14": "wood_4", "28,15": "wood_4", "28,16": "wood_4", "28,17": "wood_4", "28,18": "wood_4", "28,19": "wood_4", "28,20": "wood_4", "28,21": "wood_4", "28,22": "wood_4", "28,23": "wood_4", "28,24": "wood_4", "28,25": "wood_4", "28,26": "wood_4", "28,27": "wood_4", "28,28": "wood_4", "28,29": "wood_4", "28,30": "wood_wall_8::obstacle", "28,31": "restaurant/rest_wall_awning_window::obstacle", "28,32": "stone_5", "28,33": "stone_5", "28,34": "stone_5", "28,35": "stone_5", "29,10": "restaurant/rest_floor_kitchen_quarry", "29,11": "restaurant/rest_floor_kitchen_quarry", "29,12": "restaurant/rest_wall_bistro::obstacle", "29,13": "wood_4", "29,14": "wood_4", "29,15": "marble_2", "29,16": "marble_2", "29,17": "marble_2", "29,18": "marble_2", "29,19": "marble_2", "29,20": "marble_2", "29,21": "wood_4", "29,22": "wood_4", "29,23": "wood_4", "29,24": "wood_4", "29,25": "wood_4", "29,26": "wood_4", "29,27": "wood_4", "29,28": "wood_4", "29,29": "wood_4", "29,30": "wood_wall_8::obstacle", "29,31": "restaurant/rest_wall_awning_window::obstacle", "29,32": "stone_5", "29,33": "stone_5", "29,34": "stone_5", "29,35": "stone_5", "30,10": "restaurant/rest_floor_kitchen_quarry", "30,11": "restaurant/rest_floor_kitchen_quarry", "30,12": "restaurant/rest_wall_bistro::obstacle", "30,13": "wood_4", "30,14": "wood_4", "30,15": "marble_2", "30,16": "marble_2", "30,17": "marble_2", "30,18": "marble_2", "30,19": "marble_2", "30,20": "marble_2", "30,21": "wood_4", "30,22": "wood_4", "30,23": "wood_4", "30,24": "wood_4", "30,25": "wood_4", "30,26": "wood_4", "30,27": "wood_4", "30,28": "wood_4", "30,29": "wood_4", "30,30": "wood_wall_8::obstacle", "30,31": "restaurant/rest_wall_bistro::obstacle", "30,32": "stone_5", "30,33": "stone_5", "30,34": "stone_5", "30,35": "stone_5", "31,10": "restaurant/rest_floor_kitchen_quarry", "31,11": "restaurant/rest_floor_kitchen_quarry", "31,12": "restaurant/rest_wall_bistro::obstacle", "31,13": "wood_4", "31,14": "wood_4", "31,15": "marble_2", "31,16": "marble_2", "31,17": "marble_2", "31,18": "marble_2", "31,19": "marble_2", "31,20": "marble_2", "31,21": "wood_4", "31,22": "wood_4", "31,23": "wood_4", "31,24": "wood_4", "31,25": "wood_4", "31,26": "wood_4", "31,27": "wood_4", "31,28": "wood_4", "31,29": "wood_4", "31,30": "wood_wall_8::obstacle", "31,31": "restaurant/rest_wall_bistro::obstacle", "31,32": "stone_5", "31,33": "stone_5", "31,34": "stone_5", "31,35": "stone_5", "32,10": "restaurant/rest_floor_kitchen_quarry", "32,11": "restaurant/rest_floor_kitchen_quarry", "32,12": "restaurant/rest_wall_bistro::obstacle", "32,13": "wood_4", "32,14": "wood_4", "32,15": "marble_2", "32,16": "marble_2", "32,17": "marble_2", "32,18": "marble_2", "32,19": "marble_2", "32,20": "marble_2", "32,21": "wood_4", "32,22": "wood_4", "32,23": "wood_4", "32,24": "wood_4", "32,25": "wood_4", "32,26": "wood_4", "32,27": "wood_4", "32,28": "wood_4", "32,29": "wood_4", "32,30": "wood_wall_8::obstacle", "32,31": "restaurant/rest_wall_awning_window::obstacle", "32,32": "stone_5", "32,33": "stone_5", "32,34": "stone_5", "32,35": "stone_5", "33,10": "wood_wall_7::obstacle", "33,11": "wood_wall_7::obstacle", "33,12": "restaurant/rest_wall_bistro::obstacle", "33,13": "wood_4", "33,14": "wood_4", "33,15": "marble_2", "33,16": "marble_2", "33,17": "marble_2", "33,18": "marble_2", "33,19": "marble_2", "33,20": "marble_2", "33,21": "wood_4", "33,22": "wood_4", "33,23": "wood_4", "33,24": "wood_4", "33,25": "wood_4", "33,26": "wood_4", "33,27": "wood_4", "33,28": "wood_4", "33,29": "wood_4", "33,30": "wood_wall_8::obstacle", "33,31": "restaurant/rest_wall_awning_window::obstacle", "33,32": "stone_5", "33,33": "stone_5", "33,34": "stone_5", "33,35": "stone_5", "34,10": "marble_3", "34,11": "marble_3", "34,12": "restaurant/rest_wall_bistro::obstacle", "34,13": "wood_4", "34,14": "wood_4", "34,15": "marble_2", "34,16": "marble_2", "34,17": "marble_2", "34,18": "marble_2", "34,19": "marble_2", "34,20": "marble_2", "34,21": "wood_4", "34,22": "wood_4", "34,23": "wood_4", "34,24": "wood_4", "34,25": "wood_4", "34,26": "wood_4", "34,27": "wood_4", "34,28": "wood_4", "34,29": "wood_4", "34,30": "wood_wall_8::obstacle", "34,31": "restaurant/rest_wall_bistro::obstacle", "34,32": "stone_5", "34,33": "stone_5", "34,34": "stone_5", "34,35": "stone_5", "35,10": "marble_3", "35,11": "marble_3", "35,12": "restaurant/rest_wall_bistro::obstacle", "35,13": "wood_4", "35,14": "wood_4", "35,15": "marble_2", "35,16": "marble_2", "35,17": "marble_2", "35,18": "marble_2", "35,19": "marble_2", "35,20": "marble_2", "35,21": "wood_4", "35,22": "wood_4", "35,23": "wood_4", "35,24": "wood_4", "35,25": "wood_4", "35,26": "wood_4", "35,27": "wood_4", "35,28": "wood_4", "35,29": "wood_4", "35,30": "wood_wall_8::obstacle", "35,31": "restaurant/rest_wall_bistro::obstacle", "35,32": "stone_5", "35,33": "stone_5", "35,34": "stone_5", "35,35": "stone_5", "36,10": "marble_3", "36,11": "marble_3", "36,12": "restaurant/rest_wall_bistro::obstacle", "36,13": "wood_4", "36,14": "wood_4", "36,15": "marble_2", "36,16": "marble_2", "36,17": "marble_2", "36,18": "marble_2", "36,19": "marble_2", "36,20": "marble_2", "36,21": "wood_4", "36,22": "wood_4", "36,23": "wood_4", "36,24": "wood_4", "36,25": "wood_4", "36,26": "wood_4", "36,27": "wood_4", "36,28": "wood_4", "36,29": "wood_4", "36,30": "wood_wall_8::obstacle", "36,31": "restaurant/rest_wall_bistro::obstacle", "36,32": "stone_5", "36,33": "stone_5", "36,34": "stone_5", "36,35": "stone_5", "37,10": "marble_3", "37,11": "marble_3", "37,12": "restaurant/rest_wall_bistro::obstacle", "37,13": "wood_wall_7::obstacle", "37,14": "restaurant/rest_floor_vip_carpet", "37,15": "restaurant/rest_floor_vip_carpet", "37,16": "restaurant/rest_floor_vip_carpet", "37,17": "wood_wall_7::obstacle", "37,18": "wood_wall_7::obstacle", "37,19": "wood_wall_7::obstacle", "37,20": "wood_wall_7::obstacle", "37,21": "wood_wall_7::obstacle", "37,22": "wood_wall_7::obstacle", "37,23": "wood_wall_7::obstacle", "37,24": "wood_wall_7::obstacle", "37,25": "wood_wall_7::obstacle", "37,26": "restaurant/rest_floor_vip_carpet", "37,27": "restaurant/rest_floor_vip_carpet", "37,28": "wood_wall_7::obstacle", "37,29": "wood_wall_7::obstacle", "37,30": "wood_wall_7::obstacle", "37,31": "restaurant/rest_wall_bistro::obstacle", "37,32": "stone_5", "37,33": "stone_5", "37,34": "stone_5", "37,35": "stone_5", "38,10": "marble_3", "38,11": "marble_3", "38,12": "restaurant/rest_wall_bistro::obstacle", "38,13": "restaurant/rest_floor_vip_carpet", "38,14": "restaurant/rest_floor_vip_carpet", "38,15": "restaurant/rest_floor_vip_carpet", "38,16": "restaurant/rest_floor_vip_carpet", "38,17": "restaurant/rest_floor_vip_carpet", "38,18": "restaurant/rest_floor_vip_carpet", "38,19": "restaurant/rest_floor_vip_carpet", "38,20": "restaurant/rest_floor_vip_carpet", "38,21": "restaurant/rest_floor_vip_carpet", "38,22": "restaurant/rest_floor_vip_carpet", "38,23": "restaurant/rest_floor_vip_carpet", "38,24": "restaurant/rest_floor_vip_carpet", "38,25": "restaurant/rest_floor_vip_carpet", "38,26": "restaurant/rest_floor_vip_carpet", "38,27": "restaurant/rest_floor_vip_carpet", "38,28": "restaurant/rest_floor_vip_carpet", "38,29": "restaurant/rest_floor_vip_carpet", "38,30": "wood_wall_8::obstacle", "38,31": "restaurant/rest_wall_bistro::obstacle", "38,32": "stone_5", "38,33": "stone_5", "38,34": "stone_5", "38,35": "stone_5", "39,10": "marble_3", "39,11": "marble_3", "39,12": "restaurant/rest_wall_bistro::obstacle", "39,13": "restaurant/rest_floor_vip_carpet", "39,14": "restaurant/rest_floor_vip_carpet", "39,15": "restaurant/rest_floor_vip_carpet", "39,16": "restaurant/rest_floor_vip_carpet", "39,17": "restaurant/rest_floor_vip_carpet", "39,18": "restaurant/rest_floor_vip_carpet", "39,19": "restaurant/rest_floor_vip_carpet", "39,20": "restaurant/rest_floor_vip_carpet", "39,21": "restaurant/rest_floor_vip_carpet", "39,22": "restaurant/rest_floor_vip_carpet", "39,23": "restaurant/rest_floor_vip_carpet", "39,24": "restaurant/rest_floor_vip_carpet", "39,25": "restaurant/rest_floor_vip_carpet", "39,26": "restaurant/rest_floor_vip_carpet", "39,27": "restaurant/rest_floor_vip_carpet", "39,28": "restaurant/rest_floor_vip_carpet", "39,29": "restaurant/rest_floor_vip_carpet", "39,30": "wood_wall_8::obstacle", "39,31": "restaurant/rest_wall_awning_window::obstacle", "39,32": "stone_5", "39,33": "stone_5", "39,34": "stone_5", "39,35": "stone_5", "40,10": "marble_3", "40,11": "marble_3", "40,12": "restaurant/rest_wall_bistro::obstacle", "40,13": "restaurant/rest_floor_vip_carpet", "40,14": "restaurant/rest_floor_vip_carpet", "40,15": "restaurant/rest_floor_vip_carpet", "40,16": "restaurant/rest_floor_vip_carpet", "40,17": "restaurant/rest_floor_vip_carpet", "40,18": "restaurant/rest_floor_vip_carpet", "40,19": "restaurant/rest_floor_vip_carpet", "40,20": "restaurant/rest_floor_vip_carpet", "40,21": "restaurant/rest_floor_vip_carpet", "40,22": "restaurant/rest_floor_vip_carpet", "40,23": "restaurant/rest_floor_vip_carpet", "40,24": "restaurant/rest_floor_vip_carpet", "40,25": "restaurant/rest_floor_vip_carpet", "40,26": "restaurant/rest_floor_vip_carpet", "40,27": "restaurant/rest_floor_vip_carpet", "40,28": "restaurant/rest_floor_vip_carpet", "40,29": "restaurant/rest_floor_vip_carpet", "40,30": "wood_wall_8::obstacle", "40,31": "restaurant/rest_wall_awning_window::obstacle", "40,32": "stone_5", "40,33": "stone_5", "40,34": "stone_5", "40,35": "stone_5", "41,10": "marble_3", "41,11": "marble_3", "41,12": "restaurant/rest_wall_bistro::obstacle", "41,13": "restaurant/rest_floor_vip_carpet", "41,14": "restaurant/rest_floor_vip_carpet", "41,15": "restaurant/rest_floor_vip_carpet", "41,16": "restaurant/rest_floor_vip_carpet", "41,17": "restaurant/rest_floor_vip_carpet", "41,18": "restaurant/rest_floor_vip_carpet", "41,19": "restaurant/rest_floor_vip_carpet", "41,20": "restaurant/rest_floor_vip_carpet", "41,21": "restaurant/rest_floor_vip_carpet", "41,22": "restaurant/rest_floor_vip_carpet", "41,23": "restaurant/rest_floor_vip_carpet", "41,24": "restaurant/rest_floor_vip_carpet", "41,25": "restaurant/rest_floor_vip_carpet", "41,26": "restaurant/rest_floor_vip_carpet", "41,27": "restaurant/rest_floor_vip_carpet", "41,28": "restaurant/rest_floor_vip_carpet", "41,29": "restaurant/rest_floor_vip_carpet", "41,30": "wood_wall_8::obstacle", "41,31": "restaurant/rest_wall_bistro::obstacle", "41,32": "stone_5", "41,33": "stone_5", "41,34": "stone_5", "41,35": "stone_5", "42,10": "marble_3", "42,11": "marble_3", "42,12": "restaurant/rest_wall_bistro::obstacle", "42,13": "restaurant/rest_floor_vip_carpet", "42,14": "restaurant/rest_floor_vip_carpet", "42,15": "restaurant/rest_floor_vip_carpet", "42,16": "restaurant/rest_floor_vip_carpet", "42,17": "restaurant/rest_floor_vip_carpet", "42,18": "restaurant/rest_floor_vip_carpet", "42,19": "restaurant/rest_floor_vip_carpet", "42,20": "restaurant/rest_floor_vip_carpet", "42,21": "restaurant/rest_floor_vip_carpet", "42,22": "restaurant/rest_floor_vip_carpet", "42,23": "restaurant/rest_floor_vip_carpet", "42,24": "restaurant/rest_floor_vip_carpet", "42,25": "restaurant/rest_floor_vip_carpet", "42,26": "restaurant/rest_floor_vip_carpet", "42,27": "restaurant/rest_floor_vip_carpet", "42,28": "restaurant/rest_floor_vip_carpet", "42,29": "restaurant/rest_floor_vip_carpet", "42,30": "wood_wall_8::obstacle", "42,31": "restaurant/rest_wall_bistro::obstacle", "42,32": "grass_4", "42,33": "grass_4", "42,34": "grass_4", "42,35": "grass_4", "43,10": "marble_3", "43,11": "marble_3", "43,12": "restaurant/rest_wall_bistro::obstacle", "43,13": "restaurant/rest_floor_vip_carpet", "43,14": "restaurant/rest_floor_vip_carpet", "43,15": "restaurant/rest_floor_vip_carpet", "43,16": "restaurant/rest_floor_vip_carpet", "43,17": "restaurant/rest_floor_vip_carpet", "43,18": "restaurant/rest_floor_vip_carpet", "43,19": "restaurant/rest_floor_vip_carpet", "43,20": "restaurant/rest_floor_vip_carpet", "43,21": "restaurant/rest_floor_vip_carpet", "43,22": "restaurant/rest_floor_vip_carpet", "43,23": "restaurant/rest_floor_vip_carpet", "43,24": "restaurant/rest_floor_vip_carpet", "43,25": "restaurant/rest_floor_vip_carpet", "43,26": "restaurant/rest_floor_vip_carpet", "43,27": "restaurant/rest_floor_vip_carpet", "43,28": "restaurant/rest_floor_vip_carpet", "43,29": "restaurant/rest_floor_vip_carpet", "43,30": "wood_wall_8::obstacle", "43,31": "restaurant/rest_wall_awning_window::obstacle", "43,32": "grass_4", "43,33": "grass_4", "43,34": "grass_4", "43,35": "grass_4", "44,10": "marble_3", "44,11": "marble_3", "44,12": "restaurant/rest_wall_bistro::obstacle", "44,13": "restaurant/rest_floor_vip_carpet", "44,14": "restaurant/rest_floor_vip_carpet", "44,15": "restaurant/rest_floor_vip_carpet", "44,16": "restaurant/rest_floor_vip_carpet", "44,17": "restaurant/rest_floor_vip_carpet", "44,18": "restaurant/rest_floor_vip_carpet", "44,19": "restaurant/rest_floor_vip_carpet", "44,20": "restaurant/rest_floor_vip_carpet", "44,21": "restaurant/rest_floor_vip_carpet", "44,22": "restaurant/rest_floor_vip_carpet", "44,23": "restaurant/rest_floor_vip_carpet", "44,24": "restaurant/rest_floor_vip_carpet", "44,25": "restaurant/rest_floor_vip_carpet", "44,26": "restaurant/rest_floor_vip_carpet", "44,27": "restaurant/rest_floor_vip_carpet", "44,28": "restaurant/rest_floor_vip_carpet", "44,29": "restaurant/rest_floor_vip_carpet", "44,30": "wood_wall_8::obstacle", "44,31": "restaurant/rest_wall_awning_window::obstacle", "44,32": "grass_4", "44,33": "grass_4", "44,34": "grass_4", "44,35": "grass_4", "45,10": "marble_3", "45,11": "marble_3", "45,12": "restaurant/rest_wall_bistro::obstacle", "45,13": "restaurant/rest_floor_vip_carpet", "45,14": "restaurant/rest_floor_vip_carpet", "45,15": "restaurant/rest_floor_vip_carpet", "45,16": "restaurant/rest_floor_vip_carpet", "45,17": "restaurant/rest_floor_vip_carpet", "45,18": "restaurant/rest_floor_vip_carpet", "45,19": "restaurant/rest_floor_vip_carpet", "45,20": "restaurant/rest_floor_vip_carpet", "45,21": "restaurant/rest_floor_vip_carpet", "45,22": "restaurant/rest_floor_vip_carpet", "45,23": "restaurant/rest_floor_vip_carpet", "45,24": "restaurant/rest_floor_vip_carpet", "45,25": "restaurant/rest_floor_vip_carpet", "45,26": "restaurant/rest_floor_vip_carpet", "45,27": "restaurant/rest_floor_vip_carpet", "45,28": "restaurant/rest_floor_vip_carpet", "45,29": "restaurant/rest_floor_vip_carpet", "45,30": "wood_wall_8::obstacle", "45,31": "restaurant/rest_wall_bistro::obstacle", "45,32": "grass_4", "45,33": "grass_4", "45,34": "grass_4", "45,35": "grass_4", "46,10": "wood_wall_7::obstacle", "46,11": "wood_wall_7::obstacle", "46,12": "wood_wall_7::obstacle", "46,13": "wood_wall_7::obstacle", "46,14": "wood_wall_7::obstacle", "46,15": "wood_wall_7::obstacle", "46,16": "wood_wall_7::obstacle", "46,17": "wood_wall_7::obstacle", "46,18": "wood_wall_7::obstacle", "46,19": "wood_wall_7::obstacle", "46,20": "wood_wall_7::obstacle", "46,21": "wood_wall_7::obstacle", "46,22": "wood_wall_7::obstacle", "46,23": "wood_wall_7::obstacle", "46,24": "wood_wall_7::obstacle", "46,25": "wood_wall_7::obstacle", "46,26": "wood_wall_7::obstacle", "46,27": "wood_wall_7::obstacle", "46,28": "wood_wall_7::obstacle", "46,29": "wood_wall_7::obstacle", "46,30": "wood_wall_7::obstacle", "46,31": "wood_wall_7::obstacle", "46,32": "grass_4", "46,33": "grass_4", "46,34": "grass_4", "46,35": "grass_4", "47,10": "grass_4", "47,11": "grass_4", "47,12": "grass_4", "47,13": "grass_4", "47,14": "grass_4", "47,15": "grass_4", "47,16": "grass_4", "47,17": "grass_4", "47,18": "grass_4", "47,19": "grass_4", "47,20": "grass_4", "47,21": "grass_4", "47,22": "grass_4", "47,23": "grass_4", "47,24": "grass_4", "47,25": "grass_4", "47,26": "grass_4", "47,27": "grass_4", "47,28": "grass_4", "47,29": "grass_4", "47,30": "grass_4", "47,31": "grass_4", "47,32": "grass_4", "47,33": "grass_4", "47,34": "grass_4", "47,35": "grass_4", "spawn_point": "24,15", "freeform:deco_rest_001": "restaurant/rest_bistro_rug|none::1200,1630::passable::behind::layer:-1", "freeform:deco_rest_002": "restaurant/rest_waiting_bench|none::790,1630::solid::behind::layer:0", "freeform:deco_rest_003": "restaurant/rest_waiting_bench|none::1695,1630::solid::behind::layer:0", "freeform:deco_rest_004": "restaurant/rest_planter_olive|none::970,1635::solid::behind::layer:0", "freeform:deco_rest_005": "restaurant/rest_menu_podium|none::1358,1638::solid::behind::layer:0::interact:calendar", "freeform:deco_rest_006": "restaurant/rest_planter_olive|none::1535,1635::solid::behind::layer:0", "freeform:deco_rest_007": "restaurant/rest_bistro_tree|none::185,1680::solid::behind::layer:0", "freeform:deco_rest_008": "restaurant/rest_bistro_tree|none::410,1730::solid::behind::layer:0", "freeform:deco_rest_009": "restaurant/rest_bistro_tree|none::560,1665::solid::behind::layer:0", "freeform:deco_rest_010": "restaurant/rest_bistro_tree|none::1835,1665::solid::behind::layer:0", "freeform:deco_rest_011": "restaurant/rest_bistro_tree|none::1995,1730::solid::behind::layer:0", "freeform:deco_rest_012": "restaurant/rest_bistro_tree|none::2215,1680::solid::behind::layer:0", "freeform:deco_rest_013": "restaurant/rest_hostess_podium|none::965,1438::solid::behind::layer:0", "freeform:deco_rest_014": "restaurant/rest_bistro_rug|none::1200,1445::passable::behind::layer:-1", "freeform:deco_rest_016": "restaurant/rest_bistro_tree|none::1345,1440::solid::behind::layer:0", "freeform:deco_rest_017": "restaurant/rest_bistro_tree|none::142,765::solid::behind::layer:0", "freeform:deco_rest_018": "restaurant/rest_bistro_tree|none::142,1010::solid::behind::layer:0", "freeform:deco_rest_019": "restaurant/rest_bistro_tree|none::142,1255::solid::behind::layer:0", "freeform:deco_rest_020": "restaurant/rest_bistro_tree|none::142,1455::solid::behind::layer:0", "freeform:deco_rest_021": "restaurant/rest_booth_sofa|none::238,885::solid::behind::layer:0", "freeform:deco_rest_022": "restaurant/rest_booth_table|none::312,887::solid::behind::layer:0", "freeform:deco_rest_023": "restaurant/rest_booth_sofa|none::386,885::solid::behind::layer:0::flipx", "freeform:deco_rest_024": "restaurant/rest_booth_sofa|none::238,1130::solid::behind::layer:0", "freeform:deco_rest_025": "restaurant/rest_booth_table|none::312,1132::solid::behind::layer:0", "freeform:deco_rest_026": "restaurant/rest_booth_sofa|none::386,1130::solid::behind::layer:0::flipx", "freeform:deco_rest_027": "restaurant/rest_booth_sofa|none::238,1375::solid::behind::layer:0", "freeform:deco_rest_028": "restaurant/rest_booth_table|none::312,1377::solid::behind::layer:0", "freeform:deco_rest_029": "restaurant/rest_booth_sofa|none::386,1375::solid::behind::layer:0::flipx", "freeform:deco_rest_030": "restaurant/rest_dining_chair_front|none::633,840::solid::behind::layer:0", "freeform:deco_rest_031": "restaurant/rest_dining_chair_front|none::677,840::solid::behind::layer:0", "freeform:deco_rest_032": "restaurant/rest_dining_chair_side|none::597,887::solid::behind::layer:0", "freeform:deco_rest_033": "restaurant/rest_dining_table|none::655,885::solid::behind::layer:0", "freeform:deco_rest_034": "restaurant/rest_dining_chair_side|none::713,887::solid::behind::layer:0::flipx", "freeform:deco_rest_035": "restaurant/rest_dining_chair_front|none::633,1085::solid::behind::layer:0", "freeform:deco_rest_036": "restaurant/rest_dining_chair_front|none::677,1085::solid::behind::layer:0", "freeform:deco_rest_037": "restaurant/rest_dining_chair_side|none::597,1132::solid::behind::layer:0", "freeform:deco_rest_038": "restaurant/rest_dining_table|none::655,1130::solid::behind::layer:0", "freeform:deco_rest_039": "restaurant/rest_dining_chair_side|none::713,1132::solid::behind::layer:0::flipx", "freeform:deco_rest_040": "restaurant/rest_dining_chair_front|none::633,1330::solid::behind::layer:0", "freeform:deco_rest_041": "restaurant/rest_dining_chair_front|none::677,1330::solid::behind::layer:0", "freeform:deco_rest_042": "restaurant/rest_dining_chair_side|none::597,1377::solid::behind::layer:0", "freeform:deco_rest_043": "restaurant/rest_dining_table|none::655,1375::solid::behind::layer:0", "freeform:deco_rest_044": "restaurant/rest_dining_chair_side|none::713,1377::solid::behind::layer:0::flipx", "freeform:deco_rest_045": "restaurant/rest_dining_chair_front|none::983,840::solid::behind::layer:0", "freeform:deco_rest_046": "restaurant/rest_dining_chair_front|none::1027,840::solid::behind::layer:0", "freeform:deco_rest_047": "restaurant/rest_dining_chair_side|none::947,887::solid::behind::layer:0", "freeform:deco_rest_048": "restaurant/rest_dining_table|none::1005,885::solid::behind::layer:0", "freeform:deco_rest_049": "restaurant/rest_dining_chair_side|none::1063,887::solid::behind::layer:0::flipx", "freeform:deco_rest_050": "restaurant/rest_dining_chair_front|none::983,1085::solid::behind::layer:0", "freeform:deco_rest_051": "restaurant/rest_dining_chair_front|none::1027,1085::solid::behind::layer:0", "freeform:deco_rest_052": "restaurant/rest_dining_chair_side|none::947,1132::solid::behind::layer:0", "freeform:deco_rest_053": "restaurant/rest_dining_table|none::1005,1130::solid::behind::layer:0", "freeform:deco_rest_054": "restaurant/rest_dining_chair_side|none::1063,1132::solid::behind::layer:0::flipx", "freeform:deco_rest_055": "restaurant/rest_waiter_pos_h|none::1005,1320::solid::behind::layer:0", "freeform:deco_rest_056": "restaurant/rest_waiter_pos_v|none::1775,1235::solid::behind::layer:0", "freeform:deco_rest_057": "restaurant/rest_dining_chair_front|none::1503,1120::solid::behind::layer:0", "freeform:deco_rest_058": "restaurant/rest_dining_chair_front|none::1547,1120::solid::behind::layer:0", "freeform:deco_rest_059": "restaurant/rest_dining_chair_side|none::1467,1167::solid::behind::layer:0", "freeform:deco_rest_060": "restaurant/rest_dining_table|none::1525,1165::solid::behind::layer:0", "freeform:deco_rest_061": "restaurant/rest_dining_chair_side|none::1583,1167::solid::behind::layer:0::flipx", "freeform:deco_rest_062": "restaurant/rest_dining_chair_front|none::1503,1340::solid::behind::layer:0", "freeform:deco_rest_063": "restaurant/rest_dining_chair_front|none::1547,1340::solid::behind::layer:0", "freeform:deco_rest_064": "restaurant/rest_dining_chair_side|none::1467,1387::solid::behind::layer:0", "freeform:deco_rest_065": "restaurant/rest_dining_table|none::1525,1385::solid::behind::layer:0", "freeform:deco_rest_066": "restaurant/rest_dining_chair_side|none::1583,1387::solid::behind::layer:0::flipx", "freeform:deco_rest_067": "restaurant/rest_espresso_backbar|none::1665,808::solid::behind::layer:0", "freeform:deco_rest_068": "restaurant/rest_beverage_bar_counter|none::1665,955::solid::behind::layer:0::interact:inventory", "freeform:deco_rest_069": "restaurant/rest_bar_stool|none::1565,1004::solid::behind::layer:0", "freeform:deco_rest_070": "restaurant/rest_bar_stool|none::1632,1004::solid::behind::layer:0", "freeform:deco_rest_071": "restaurant/rest_bar_stool|none::1699,1004::solid::behind::layer:0", "freeform:deco_rest_072": "restaurant/rest_bar_stool|none::1766,1004::solid::behind::layer:0", "freeform:deco_rest_073": "restaurant/rest_expo_pass_counter|none::825,622::solid::behind::layer:0", "freeform:deco_rest_074": "restaurant/rest_scullery_sink|none::162,152::solid::behind::layer:0", "freeform:deco_rest_075": "restaurant/rest_commercial_dishwasher|none::240,152::solid::behind::layer:0", "freeform:deco_rest_076": "restaurant/rest_dish_drying_station|none::318,152::solid::behind::layer:0", "freeform:deco_rest_077": "restaurant/rest_dish_drop_counter|none::208,490::solid::behind::layer:0", "freeform:deco_rest_078": "restaurant/rest_pizza_oven|none::520,156::solid::behind::layer:0", "freeform:deco_rest_079": "restaurant/rest_gas_range|none::720,155::solid::behind::layer:0", "freeform:deco_rest_080": "restaurant/rest_grill_station|none::824,155::solid::behind::layer:0", "freeform:deco_rest_081": "restaurant/rest_gas_range|none::928,155::solid::behind::layer:0", "freeform:deco_rest_082": "restaurant/rest_deep_fryer|none::1008,155::solid::behind::layer:0", "freeform:deco_rest_083": "restaurant/rest_exhaust_hood|none::720,102::passable::ontop::layer:1", "freeform:deco_rest_084": "restaurant/rest_exhaust_hood|none::824,102::passable::ontop::layer:1", "freeform:deco_rest_085": "restaurant/rest_exhaust_hood|none::928,102::passable::ontop::layer:1", "freeform:deco_rest_086": "restaurant/rest_pastry_bench|none::1325,155::solid::behind::layer:0", "freeform:deco_rest_087": "restaurant/rest_central_plating_island|none::845,385::solid::behind::layer:0", "freeform:deco_rest_088": "restaurant/rest_garde_manger|none::1325,385::solid::behind::layer:0", "freeform:deco_rest_089": "restaurant/rest_vip_armchair_front|none::2015,866::solid::behind::layer:0", "freeform:deco_rest_090": "restaurant/rest_vip_armchair_front|none::2065,866::solid::behind::layer:0", "freeform:deco_rest_091": "restaurant/rest_vip_armchair_front|none::2115,866::solid::behind::layer:0", "freeform:deco_rest_092": "restaurant/rest_vip_armchair_side|none::1975,920::solid::behind::layer:0", "freeform:deco_rest_093": "restaurant/rest_vip_banquet_table|none::2065,920::solid::behind::layer:0", "freeform:deco_rest_094": "restaurant/rest_vip_armchair_side|none::2155,920::solid::behind::layer:0::flipx", "freeform:deco_rest_095": "restaurant/rest_vip_armchair_back|none::2015,971::solid::behind::layer:0", "freeform:deco_rest_096": "restaurant/rest_vip_armchair_back|none::2065,971::solid::behind::layer:0", "freeform:deco_rest_097": "restaurant/rest_vip_armchair_back|none::2115,971::solid::behind::layer:0", "freeform:deco_rest_098": "restaurant/rest_vip_armchair_front|none::2015,1131::solid::behind::layer:0", "freeform:deco_rest_099": "restaurant/rest_vip_armchair_front|none::2065,1131::solid::behind::layer:0", "freeform:deco_rest_100": "restaurant/rest_vip_armchair_front|none::2115,1131::solid::behind::layer:0", "freeform:deco_rest_101": "restaurant/rest_vip_armchair_side|none::1975,1185::solid::behind::layer:0", "freeform:deco_rest_102": "restaurant/rest_vip_banquet_table|none::2065,1185::solid::behind::layer:0", "freeform:deco_rest_103": "restaurant/rest_vip_armchair_side|none::2155,1185::solid::behind::layer:0::flipx", "freeform:deco_rest_104": "restaurant/rest_vip_armchair_back|none::2015,1236::solid::behind::layer:0", "freeform:deco_rest_105": "restaurant/rest_vip_armchair_back|none::2065,1236::solid::behind::layer:0", "freeform:deco_rest_106": "restaurant/rest_vip_armchair_back|none::2115,1236::solid::behind::layer:0", "freeform:deco_rest_107": "restaurant/rest_wine_cellar_rack|none::2268,860::solid::behind::layer:0", "freeform:deco_rest_108": "restaurant/rest_wine_cellar_rack|none::2268,1110::solid::behind::layer:0", "freeform:deco_rest_109": "restaurant/rest_vip_sideboard|none::2105,1445::solid::behind::layer:0", "freeform:deco_rest_110": "restaurant/rest_pantry_tall_cabinet|none::1732,152::solid::behind::layer:0", "freeform:deco_rest_111": "restaurant/rest_pantry_spice_rack|none::1788,136::solid::behind::layer:0", "freeform:deco_rest_112": "restaurant/rest_pantry_supply_crate|none::1788,200::solid::behind::layer:0", "freeform:deco_rest_113": "restaurant/rest_pantry_dry_shelf|none::1760,520::solid::behind::layer:0", "freeform:deco_rest_114": "restaurant/rest_pantry_cookware_rack|none::1862,514::solid::behind::layer:0", "freeform:deco_rest_115": "restaurant/rest_commercial_fridge|none::2108,168::solid::behind::layer:0", "freeform:deco_rest_116": "restaurant/rest_walkin_cooler_door|none::2185,165::solid::behind::layer:0", "freeform:deco_rest_117": "restaurant/rest_commercial_freezer|none::2262,168::solid::behind::layer:0", "freeform:deco_rest_118": "restaurant/rest_staff_locker|none::2000,488::solid::behind::layer:0", "freeform:deco_rest_119": "restaurant/rest_staff_locker|none::2050,488::solid::behind::layer:0", "freeform:deco_rest_120": "restaurant/rest_staff_locker|none::2100,488::solid::behind::layer:0", "freeform:deco_rest_121": "restaurant/rest_dining_chair_front|none::2193,466::solid::behind::layer:0", "freeform:deco_rest_122": "restaurant/rest_dining_chair_front|none::2237,466::solid::behind::layer:0", "freeform:deco_rest_123": "restaurant/rest_staff_break_table|none::2215,510::solid::behind::layer:0"}	[{"id": "pz_rest_dining_west", "name": "West Bistro Dining", "bounds": {"maxCol": 21, "maxRow": 29, "minCol": 2, "minRow": 13}, "createdAt": 1795272790708}, {"id": "pz_rest_dining_east", "name": "East Dining & Hostess Lounge", "bounds": {"maxCol": 36, "maxRow": 29, "minCol": 26, "minRow": 21}, "createdAt": 1795272790709}, {"id": "pz_rest_espresso_bar", "name": "Espresso & Dessert Bar", "bounds": {"maxCol": 36, "maxRow": 20, "minCol": 29, "minRow": 15}, "createdAt": 1795272790710}, {"id": "pz_rest_vip_salon", "name": "VIP Dining & Wine Salon", "bounds": {"maxCol": 45, "maxRow": 29, "minCol": 38, "minRow": 13}, "createdAt": 1795272790711}, {"id": "pz_rest_kitchen", "name": "Commercial Kitchen", "bounds": {"maxCol": 32, "maxRow": 11, "minCol": 2, "minRow": 2}, "createdAt": 1795272790712}, {"id": "pz_rest_pantry", "name": "Chiller, Pantry & Staff Room", "bounds": {"maxCol": 45, "maxRow": 11, "minCol": 34, "minRow": 2}, "createdAt": 1795272790713}]	[{"x": 1795, "y": 1445, "id": "jukebox_restaurant_main", "layer": 0, "ontop": false, "spaceId": "space_restaurant", "passable": false, "pausedAt": 0, "playlist": [], "isPlaying": false, "interaction": "jukebox", "interactable": true, "trackStartedAt": 0, "currentTrackIndex": 0}]	[]	[]	[]	[]	[]	[]	auto	{"x": 1375, "y": 705, "id": "seller_space_restaurant", "layer": 0, "enabled": true, "spaceId": "space_restaurant", "shopTheme": "auto", "showCounter": true}
user_space_17	nooogel's Space	Personal	17	f	f	[]	2026-11-19 09:42:55.30366+00	2026-11-19 09:42:55.30366+00	{}	[]	[]	[]	[]	[]	[]	[]	[]	auto	\N
space_1794994971056_gtps5	Pet Shop	Hangout Lounges	8	t	t	[]	2026-11-18 09:42:51.05747+00	2026-11-21 06:17:25.678396+00	{"0,0": "grass_4", "0,1": "grass_4", "0,2": "grass_4", "0,3": "grass_4", "0,4": "grass_4", "0,5": "grass_4", "0,6": "grass_4", "0,7": "grass_4", "0,8": "grass_4", "0,9": "grass_4", "1,0": "wood_wall_18::obstacle", "1,1": "wood_wall_7::obstacle", "1,2": "wood_wall_7::obstacle", "1,3": "wood_wall_7::obstacle", "1,4": "wood_wall_7::obstacle", "1,5": "wood_wall_7::obstacle", "1,6": "wood_wall_7::obstacle", "1,7": "wood_wall_7::obstacle", "1,8": "wood_wall_7::obstacle", "1,9": "wood_wall_7::obstacle", "2,0": "wood_wall_8::obstacle", "2,1": "wood_wall_3::obstacle", "2,2": "living_room_floor/sprite-4-1-18-2x2", "2,3": "living_room_floor/sprite-4-1-18-2x2", "2,4": "living_room_floor/sprite-4-1-18-2x2", "2,5": "living_room_floor/sprite-4-1-18-2x2", "2,6": "living_room_floor/sprite-4-1-18-2x2", "2,7": "living_room_floor/sprite-4-1-18-2x2", "2,8": "living_room_floor/sprite-4-1-18-2x2", "2,9": "living_room_floor/sprite-4-1-18-2x2", "3,0": "wood_wall_8::obstacle", "3,1": "wood_wall_3::obstacle", "3,2": "living_room_floor/sprite-4-1-18-2x2", "3,3": "living_room_floor/sprite-4-1-18-2x2", "3,4": "living_room_floor/sprite-4-1-18-2x2", "3,5": "living_room_floor/sprite-4-1-18-2x2", "3,6": "living_room_floor/sprite-4-1-18-2x2", "3,7": "living_room_floor/sprite-4-1-18-2x2", "3,8": "living_room_floor/sprite-4-1-18-2x2", "3,9": "living_room_floor/sprite-4-1-18-2x2", "4,0": "wood_wall_8::obstacle", "4,1": "wood_wall_3::obstacle", "4,2": "living_room_floor/sprite-4-1-18-2x2", "4,3": "living_room_floor/sprite-4-1-18-2x2", "4,4": "living_room_floor/sprite-4-1-18-2x2", "4,5": "living_room_floor/sprite-4-1-18-2x2", "4,6": "living_room_floor/sprite-4-1-18-2x2", "4,7": "living_room_floor/sprite-4-1-18-2x2", "4,8": "living_room_floor/sprite-4-1-18-2x2", "4,9": "living_room_floor/sprite-4-1-18-2x2", "5,0": "wood_wall_8::obstacle", "5,1": "wood_wall_3::obstacle", "5,2": "living_room_floor/sprite-4-1-18-2x2", "5,3": "living_room_floor/sprite-4-1-18-2x2", "5,4": "living_room_floor/sprite-4-1-18-2x2", "5,5": "living_room_floor/sprite-4-1-18-2x2", "5,6": "living_room_floor/sprite-4-1-18-2x2", "5,7": "living_room_floor/sprite-4-1-18-2x2", "5,8": "living_room_floor/sprite-4-1-18-2x2", "5,9": "living_room_floor/sprite-4-1-18-2x2", "6,0": "wood_wall_8::obstacle", "6,1": "wood_wall_3::obstacle", "6,2": "living_room_floor/sprite-4-1-18-2x2", "6,3": "living_room_floor/sprite-4-1-18-2x2", "6,4": "living_room_floor/sprite-4-1-18-2x2", "6,5": "living_room_floor/sprite-4-1-18-2x2", "6,6": "living_room_floor/sprite-4-1-18-2x2", "6,7": "living_room_floor/sprite-4-1-18-2x2", "6,8": "living_room_floor/sprite-4-1-18-2x2", "6,9": "living_room_floor/sprite-4-1-18-2x2", "7,0": "wood_wall_8::obstacle", "7,1": "wood_wall_3::obstacle", "7,2": "living_room_floor/sprite-4-1-18-2x2", "7,3": "living_room_floor/sprite-4-1-18-2x2", "7,4": "living_room_floor/sprite-4-1-18-2x2", "7,5": "living_room_floor/sprite-4-1-18-2x2", "7,6": "living_room_floor/sprite-4-1-18-2x2", "7,7": "living_room_floor/sprite-4-1-18-2x2", "7,8": "living_room_floor/sprite-4-1-18-2x2", "7,9": "living_room_floor/sprite-4-1-18-2x2", "8,0": "wood_wall_8::obstacle", "8,1": "wood_wall_3::obstacle", "8,2": "living_room_floor/sprite-4-1-18-2x2", "8,3": "living_room_floor/sprite-4-1-18-2x2", "8,4": "living_room_floor/sprite-4-1-18-2x2", "8,5": "living_room_floor/sprite-4-1-18-2x2", "8,6": "living_room_floor/sprite-4-1-18-2x2", "8,7": "living_room_floor/sprite-4-1-18-2x2", "8,8": "living_room_floor/sprite-4-1-18-2x2", "8,9": "living_room_floor/sprite-4-1-18-2x2", "9,0": "wood_wall_8::obstacle", "9,1": "wood_wall_3::obstacle", "9,2": "living_room_floor/sprite-4-1-18-2x2", "9,3": "living_room_floor/sprite-4-1-18-2x2", "9,4": "living_room_floor/sprite-4-1-18-2x2", "9,5": "living_room_floor/sprite-4-1-18-2x2", "9,6": "living_room_floor/sprite-4-1-18-2x2", "9,7": "living_room_floor/sprite-4-1-18-2x2", "9,8": "living_room_floor/sprite-4-1-18-2x2", "9,9": "living_room_floor/sprite-4-1-18-2x2", "0,10": "grass_4", "0,11": "grass_4", "0,12": "grass_4", "0,13": "grass_4", "0,14": "grass_4", "0,15": "grass_4", "0,16": "grass_4", "0,17": "grass_4", "0,18": "grass_4", "0,19": "grass_4", "0,20": "grass_4", "0,21": "grass_4", "0,22": "grass_4", "0,23": "grass_4", "0,24": "grass_4", "0,25": "grass_4", "0,26": "grass_4", "0,27": "grass_4", "0,28": "grass_4", "0,29": "grass_4", "0,30": "grass_4", "0,31": "stone_5", "0,32": "stone_5", "0,33": "stone_5", "0,34": "stone_5", "0,35": "stone_5", "1,10": "wood_wall_7::obstacle", "1,11": "wood_wall_7::obstacle", "1,12": "wood_wall_7::obstacle", "1,13": "wood_wall_7::obstacle", "1,14": "wood_wall_7::obstacle", "1,15": "wood_wall_16::obstacle", "1,16": "wood_wall_7::obstacle", "1,17": "wood_wall_7::obstacle", "1,18": "wood_wall_7::obstacle", "1,19": "wood_wall_7::obstacle", "1,20": "wood_wall_7::obstacle", "1,21": "wood_wall_7::obstacle", "1,22": "wood_wall_7::obstacle", "1,23": "wood_wall_7::obstacle", "1,24": "wood_wall_7::obstacle", "1,25": "wood_wall_7::obstacle", "1,26": "wood_wall_7::obstacle", "1,27": "wood_wall_7::obstacle", "1,28": "wood_wall_7::obstacle", "1,29": "wood_wall_7::obstacle", "1,30": "wood_wall_5::obstacle", "1,31": "stone_5", "1,32": "stone_5", "1,33": "stone_5", "1,34": "stone_5", "1,35": "stone_5", "10,0": "wood_wall_8::obstacle", "10,1": "wood_wall_3::obstacle", "10,2": "living_room_floor/sprite-4-1-18-2x2", "10,3": "living_room_floor/sprite-4-1-18-2x2", "10,4": "living_room_floor/sprite-4-1-18-2x2", "10,5": "living_room_floor/sprite-4-1-18-2x2", "10,6": "living_room_floor/sprite-4-1-18-2x2", "10,7": "living_room_floor/sprite-4-1-18-2x2", "10,8": "living_room_floor/sprite-4-1-18-2x2", "10,9": "living_room_floor/sprite-4-1-18-2x2", "11,0": "wood_wall_8::obstacle", "11,1": "wood_wall_3::obstacle", "11,2": "living_room_floor/sprite-4-1-18-2x2", "11,3": "living_room_floor/sprite-4-1-18-2x2", "11,4": "living_room_floor/sprite-4-1-18-2x2", "11,5": "living_room_floor/sprite-4-1-18-2x2", "11,6": "living_room_floor/sprite-4-1-18-2x2", "11,7": "living_room_floor/sprite-4-1-18-2x2", "11,8": "living_room_floor/sprite-4-1-18-2x2", "11,9": "living_room_floor/sprite-4-1-18-2x2", "12,0": "wood_wall_8::obstacle", "12,1": "wood_wall_3::obstacle", "12,2": "living_room_floor/sprite-4-1-18-2x2", "12,3": "living_room_floor/sprite-4-1-18-2x2", "12,4": "living_room_floor/sprite-4-1-18-2x2", "12,5": "living_room_floor/sprite-4-1-18-2x2", "12,6": "living_room_floor/sprite-4-1-18-2x2", "12,7": "living_room_floor/sprite-4-1-18-2x2", "12,8": "living_room_floor/sprite-4-1-18-2x2", "12,9": "living_room_floor/sprite-4-1-18-2x2", "13,0": "wood_wall_8::obstacle", "13,1": "wood_wall_3::obstacle", "13,2": "living_room_floor/sprite-4-1-18-2x2", "13,3": "living_room_floor/sprite-4-1-18-2x2", "13,4": "living_room_floor/sprite-4-1-18-2x2", "13,5": "living_room_floor/sprite-4-1-18-2x2", "13,6": "living_room_floor/sprite-4-1-18-2x2", "13,7": "living_room_floor/sprite-4-1-18-2x2", "13,8": "living_room_floor/sprite-4-1-18-2x2", "13,9": "living_room_floor/sprite-4-1-18-2x2", "14,0": "wood_wall_8::obstacle", "14,1": "wood_wall_3::obstacle", "14,2": "living_room_floor/sprite-4-1-18-2x2", "14,3": "living_room_floor/sprite-4-1-18-2x2", "14,4": "living_room_floor/sprite-4-1-18-2x2", "14,5": "living_room_floor/sprite-4-1-18-2x2", "14,6": "living_room_floor/sprite-4-1-18-2x2", "14,7": "living_room_floor/sprite-4-1-18-2x2", "14,8": "living_room_floor/sprite-4-1-18-2x2", "14,9": "living_room_floor/sprite-4-1-18-2x2", "15,0": "wood_wall_8::obstacle", "15,1": "wood_wall_3::obstacle", "15,2": "living_room_floor/sprite-4-1-18-2x2", "15,3": "living_room_floor/sprite-4-1-18-2x2", "15,4": "living_room_floor/sprite-4-1-18-2x2", "15,5": "living_room_floor/sprite-4-1-18-2x2", "15,6": "living_room_floor/sprite-4-1-18-2x2", "15,7": "living_room_floor/sprite-4-1-18-2x2", "15,8": "living_room_floor/sprite-4-1-18-2x2", "15,9": "living_room_floor/sprite-4-1-18-2x2", "16,0": "wood_wall_8::obstacle", "16,1": "wood_wall_3::obstacle", "16,2": "living_room_floor/sprite-4-1-18-2x2", "16,3": "living_room_floor/sprite-4-1-18-2x2", "16,4": "living_room_floor/sprite-4-1-18-2x2", "16,5": "living_room_floor/sprite-4-1-18-2x2", "16,6": "living_room_floor/sprite-4-1-18-2x2", "16,7": "living_room_floor/sprite-4-1-18-2x2", "16,8": "living_room_floor/sprite-4-1-18-2x2", "16,9": "living_room_floor/sprite-4-1-18-2x2", "17,0": "wood_wall_8::obstacle", "17,1": "wood_wall_3::obstacle", "17,2": "living_room_floor/sprite-4-1-18-2x2", "17,3": "living_room_floor/sprite-4-1-18-2x2", "17,4": "living_room_floor/sprite-4-1-18-2x2", "17,5": "living_room_floor/sprite-4-1-18-2x2", "17,6": "living_room_floor/sprite-4-1-18-2x2", "17,7": "living_room_floor/sprite-4-1-18-2x2", "17,8": "living_room_floor/sprite-4-1-18-2x2", "17,9": "living_room_floor/sprite-4-1-18-2x2", "18,0": "wood_wall_14::obstacle", "18,1": "wood_wall_7::obstacle", "18,2": "wood_wall_7::obstacle", "18,3": "wood_wall_7::obstacle", "18,4": "wood_wall_7::obstacle", "18,5": "wood_wall_7::obstacle", "18,6": "wood_wall_7::obstacle", "18,7": "wood_wall_7::obstacle", "18,8": "wood_wall_7::obstacle", "18,9": "wood_wall_7::obstacle", "19,0": "wood_wall_8::obstacle", "19,1": "wood_wall_3::obstacle", "19,2": "wood_3", "19,3": "wood_3", "19,4": "wood_3", "19,5": "wood_3", "19,6": "wood_3", "19,7": "wood_3", "19,8": "wood_3", "19,9": "wood_3", "2,10": "living_room_floor/sprite-4-1-18-2x2", "2,11": "living_room_floor/sprite-4-1-18-2x2", "2,12": "living_room_floor/sprite-4-1-18-2x2", "2,13": "living_room_floor/sprite-4-1-18-2x2", "2,14": "living_room_floor/sprite-4-1-18-2x2", "2,15": "wood_wall_8::obstacle", "2,16": "wood_5", "2,17": "wood_5", "2,18": "wood_5", "2,19": "wood_5", "2,20": "wood_5", "2,21": "wood_5", "2,22": "wood_5", "2,23": "wood_5", "2,24": "wood_5", "2,25": "wood_5", "2,26": "wood_5", "2,27": "wood_5", "2,28": "wood_5", "2,29": "wood_5", "2,30": "glass_1::obstacle", "2,31": "stone_5", "2,32": "stone_5", "2,33": "stone_5", "2,34": "stone_5", "2,35": "stone_5", "20,0": "wood_wall_8::obstacle", "20,1": "wood_wall_3::obstacle", "20,2": "wood_3", "20,3": "wood_3", "20,4": "wood_3", "20,5": "wood_3", "20,6": "wood_3", "20,7": "wood_3", "20,8": "wood_3", "20,9": "wood_3", "21,0": "wood_wall_8::obstacle", "21,1": "wood_wall_3::obstacle", "21,2": "wood_3", "21,3": "wood_3", "21,4": "wood_3", "21,5": "wood_3", "21,6": "wood_3", "21,7": "wood_3", "21,8": "wood_3", "21,9": "wood_3", "22,0": "wood_wall_8::obstacle", "22,1": "wood_wall_3::obstacle", "22,2": "wood_3", "22,3": "wood_3", "22,4": "wood_3", "22,5": "wood_3", "22,6": "wood_3", "22,7": "wood_3", "22,8": "wood_3", "22,9": "wood_3", "23,0": "wood_wall_8::obstacle", "23,1": "wood_wall_3::obstacle", "23,2": "wood_3", "23,3": "wood_3", "23,4": "wood_3", "23,5": "wood_3", "23,6": "wood_3", "23,7": "wood_3", "23,8": "wood_3", "23,9": "wood_3", "24,0": "wood_wall_8::obstacle", "24,1": "wood_wall_3::obstacle", "24,2": "wood_3", "24,3": "wood_3", "24,4": "wood_3", "24,5": "wood_3", "24,6": "wood_3", "24,7": "wood_3", "24,8": "wood_3", "24,9": "wood_3", "25,0": "wood_wall_8::obstacle", "25,1": "wood_wall_3::obstacle", "25,2": "wood_3", "25,3": "wood_3", "25,4": "wood_3", "25,5": "wood_3", "25,6": "wood_3", "25,7": "wood_3", "25,8": "wood_3", "25,9": "wood_3", "26,0": "wood_wall_8::obstacle", "26,1": "wood_wall_3::obstacle", "26,2": "wood_3", "26,3": "wood_3", "26,4": "wood_3", "26,5": "wood_3", "26,6": "wood_3", "26,7": "wood_3", "26,8": "wood_3", "26,9": "wood_3", "27,0": "wood_wall_8::obstacle", "27,1": "wood_wall_3::obstacle", "27,2": "wood_3", "27,3": "wood_3", "27,4": "wood_3", "27,5": "wood_3", "27,6": "wood_3", "27,7": "wood_3", "27,8": "wood_3", "27,9": "wood_3", "28,0": "wood_wall_8::obstacle", "28,1": "wood_wall_3::obstacle", "28,2": "wood_3", "28,3": "wood_3", "28,4": "wood_3", "28,5": "wood_3", "28,6": "wood_3", "28,7": "wood_3", "28,8": "wood_3", "28,9": "wood_3", "29,0": "wood_wall_8::obstacle", "29,1": "wood_wall_3::obstacle", "29,2": "wood_3", "29,3": "wood_3", "29,4": "wood_3", "29,5": "wood_3", "29,6": "wood_3", "29,7": "wood_3", "29,8": "wood_3", "29,9": "wood_3", "3,10": "living_room_floor/sprite-4-1-18-2x2", "3,11": "living_room_floor/sprite-4-1-18-2x2", "3,12": "living_room_floor/sprite-4-1-18-2x2", "3,13": "living_room_floor/sprite-4-1-18-2x2", "3,14": "living_room_floor/sprite-4-1-18-2x2", "3,15": "wood_wall_8::obstacle", "3,16": "wood_5", "3,17": "wood_5", "3,18": "wood_5", "3,19": "wood_5", "3,20": "wood_5", "3,21": "wood_5", "3,22": "wood_5", "3,23": "wood_5", "3,24": "wood_5", "3,25": "wood_5", "3,26": "wood_5", "3,27": "wood_5", "3,28": "wood_5", "3,29": "wood_5", "3,30": "glass_1::obstacle", "3,31": "stone_5", "3,32": "stone_5", "3,33": "stone_5", "3,34": "stone_5", "3,35": "stone_5", "30,0": "wood_wall_14::obstacle", "30,1": "wood_wall_7::obstacle", "30,2": "wood_wall_7::obstacle", "30,3": "wood_wall_7::obstacle", "30,4": "wood_wall_7::obstacle", "30,5": "wood_wall_7::obstacle", "30,6": "wood_wall_7::obstacle", "30,7": "wood_wall_7::obstacle", "30,8": "wood_wall_7::obstacle", "30,9": "wood_wall_5::obstacle", "31,0": "wood_wall_8::obstacle", "31,1": "wood_wall_3::obstacle", "31,2": "living_room_floor/6 2-floor-grey-2x2", "31,3": "living_room_floor/6 2-floor-grey-2x2", "31,4": "living_room_floor/6 2-floor-grey-2x2", "31,5": "living_room_floor/6 2-floor-grey-2x2", "31,6": "living_room_floor/6 2-floor-grey-2x2", "31,7": "living_room_floor/6 2-floor-grey-2x2", "31,8": "living_room_floor/6 2-floor-grey-2x2", "31,9": "living_room_floor/6 2-floor-grey-2x2", "32,0": "wood_wall_8::obstacle", "32,1": "wood_wall_3::obstacle", "32,2": "living_room_floor/6 2-floor-grey-2x2", "32,3": "living_room_floor/6 2-floor-grey-2x2", "32,4": "living_room_floor/6 2-floor-grey-2x2", "32,5": "living_room_floor/6 2-floor-grey-2x2", "32,6": "living_room_floor/6 2-floor-grey-2x2", "32,7": "living_room_floor/6 2-floor-grey-2x2", "32,8": "living_room_floor/6 2-floor-grey-2x2", "32,9": "living_room_floor/6 2-floor-grey-2x2", "33,0": "wood_wall_8::obstacle", "33,1": "wood_wall_3::obstacle", "33,2": "living_room_floor/6 2-floor-grey-2x2", "33,3": "living_room_floor/6 2-floor-grey-2x2", "33,4": "living_room_floor/6 2-floor-grey-2x2", "33,5": "living_room_floor/6 2-floor-grey-2x2", "33,6": "living_room_floor/6 2-floor-grey-2x2", "33,7": "living_room_floor/6 2-floor-grey-2x2", "33,8": "living_room_floor/6 2-floor-grey-2x2", "33,9": "living_room_floor/6 2-floor-grey-2x2", "34,0": "wood_wall_8::obstacle", "34,1": "wood_wall_3::obstacle", "34,2": "living_room_floor/6 2-floor-grey-2x2", "34,3": "living_room_floor/6 2-floor-grey-2x2", "34,4": "living_room_floor/6 2-floor-grey-2x2", "34,5": "living_room_floor/6 2-floor-grey-2x2", "34,6": "living_room_floor/6 2-floor-grey-2x2", "34,7": "living_room_floor/6 2-floor-grey-2x2", "34,8": "living_room_floor/6 2-floor-grey-2x2", "34,9": "living_room_floor/6 2-floor-grey-2x2", "35,0": "wood_wall_8::obstacle", "35,1": "wood_wall_3::obstacle", "35,2": "living_room_floor/6 2-floor-grey-2x2", "35,3": "living_room_floor/6 2-floor-grey-2x2", "35,4": "living_room_floor/6 2-floor-grey-2x2", "35,5": "living_room_floor/6 2-floor-grey-2x2", "35,6": "living_room_floor/6 2-floor-grey-2x2", "35,7": "living_room_floor/6 2-floor-grey-2x2", "35,8": "living_room_floor/6 2-floor-grey-2x2", "35,9": "living_room_floor/6 2-floor-grey-2x2", "36,0": "wood_wall_9::obstacle", "36,1": "wood_wall_3::obstacle", "36,2": "living_room_floor/6 2-floor-grey-2x2", "36,3": "living_room_floor/6 2-floor-grey-2x2", "36,4": "living_room_floor/6 2-floor-grey-2x2", "36,5": "living_room_floor/6 2-floor-grey-2x2", "36,6": "living_room_floor/6 2-floor-grey-2x2", "36,7": "living_room_floor/6 2-floor-grey-2x2", "36,8": "living_room_floor/6 2-floor-grey-2x2", "36,9": "living_room_floor/6 2-floor-grey-2x2", "37,0": "living_room_floor/6 2-floor-grey-2x2", "37,1": "living_room_floor/6 2-floor-grey-2x2", "37,2": "living_room_floor/6 2-floor-grey-2x2", "37,3": "living_room_floor/6 2-floor-grey-2x2", "37,4": "living_room_floor/6 2-floor-grey-2x2", "37,5": "living_room_floor/6 2-floor-grey-2x2", "37,6": "living_room_floor/6 2-floor-grey-2x2", "37,7": "living_room_floor/6 2-floor-grey-2x2", "37,8": "living_room_floor/6 2-floor-grey-2x2", "37,9": "living_room_floor/6 2-floor-grey-2x2", "38,0": "living_room_floor/6 2-floor-grey-2x2", "38,1": "living_room_floor/6 2-floor-grey-2x2", "38,2": "living_room_floor/6 2-floor-grey-2x2", "38,3": "living_room_floor/6 2-floor-grey-2x2", "38,4": "living_room_floor/6 2-floor-grey-2x2", "38,5": "living_room_floor/6 2-floor-grey-2x2", "38,6": "living_room_floor/6 2-floor-grey-2x2", "38,7": "living_room_floor/6 2-floor-grey-2x2", "38,8": "living_room_floor/6 2-floor-grey-2x2", "38,9": "living_room_floor/6 2-floor-grey-2x2", "39,0": "living_room_floor/6 2-floor-grey-2x2", "39,1": "living_room_floor/6 2-floor-grey-2x2", "39,2": "living_room_floor/6 2-floor-grey-2x2", "39,3": "living_room_floor/6 2-floor-grey-2x2", "39,4": "living_room_floor/6 2-floor-grey-2x2", "39,5": "living_room_floor/6 2-floor-grey-2x2", "39,6": "living_room_floor/6 2-floor-grey-2x2", "39,7": "living_room_floor/6 2-floor-grey-2x2", "39,8": "living_room_floor/6 2-floor-grey-2x2", "39,9": "living_room_floor/6 2-floor-grey-2x2", "4,10": "living_room_floor/sprite-4-1-18-2x2", "4,11": "living_room_floor/sprite-4-1-18-2x2", "4,12": "living_room_floor/sprite-4-1-18-2x2", "4,13": "living_room_floor/sprite-4-1-18-2x2", "4,14": "living_room_floor/sprite-4-1-18-2x2", "4,15": "wood_wall_8::obstacle", "4,16": "wood_5", "4,17": "wood_5", "4,18": "wood_5", "4,19": "wood_5", "4,20": "wood_5", "4,21": "wood_5", "4,22": "wood_5", "4,23": "wood_5", "4,24": "wood_5", "4,25": "wood_5", "4,26": "wood_5", "4,27": "wood_5", "4,28": "wood_5", "4,29": "wood_5", "4,30": "glass_1::obstacle", "4,31": "stone_5", "4,32": "stone_5", "4,33": "stone_5", "4,34": "stone_5", "4,35": "stone_5", "40,0": "living_room_floor/6 2-floor-grey-2x2", "40,1": "living_room_floor/6 2-floor-grey-2x2", "40,2": "living_room_floor/6 2-floor-grey-2x2", "40,3": "living_room_floor/6 2-floor-grey-2x2", "40,4": "living_room_floor/6 2-floor-grey-2x2", "40,5": "living_room_floor/6 2-floor-grey-2x2", "40,6": "living_room_floor/6 2-floor-grey-2x2", "40,7": "living_room_floor/6 2-floor-grey-2x2", "40,8": "living_room_floor/6 2-floor-grey-2x2", "40,9": "living_room_floor/6 2-floor-grey-2x2", "41,0": "wood_wall_10::obstacle", "41,1": "wood_wall_3::obstacle", "41,2": "living_room_floor/6 2-floor-grey-2x2", "41,3": "living_room_floor/6 2-floor-grey-2x2", "41,4": "living_room_floor/6 2-floor-grey-2x2", "41,5": "living_room_floor/6 2-floor-grey-2x2", "41,6": "living_room_floor/6 2-floor-grey-2x2", "41,7": "living_room_floor/6 2-floor-grey-2x2", "41,8": "living_room_floor/6 2-floor-grey-2x2", "41,9": "living_room_floor/6 2-floor-grey-2x2", "42,0": "wood_wall_8::obstacle", "42,1": "wood_wall_3::obstacle", "42,2": "living_room_floor/6 2-floor-grey-2x2", "42,3": "living_room_floor/6 2-floor-grey-2x2", "42,4": "living_room_floor/6 2-floor-grey-2x2", "42,5": "living_room_floor/6 2-floor-grey-2x2", "42,6": "living_room_floor/6 2-floor-grey-2x2", "42,7": "living_room_floor/6 2-floor-grey-2x2", "42,8": "living_room_floor/6 2-floor-grey-2x2", "42,9": "living_room_floor/6 2-floor-grey-2x2", "43,0": "wood_wall_8::obstacle", "43,1": "wood_wall_3::obstacle", "43,2": "living_room_floor/6 2-floor-grey-2x2", "43,3": "living_room_floor/6 2-floor-grey-2x2", "43,4": "living_room_floor/6 2-floor-grey-2x2", "43,5": "living_room_floor/6 2-floor-grey-2x2", "43,6": "living_room_floor/6 2-floor-grey-2x2", "43,7": "living_room_floor/6 2-floor-grey-2x2", "43,8": "living_room_floor/6 2-floor-grey-2x2", "43,9": "living_room_floor/6 2-floor-grey-2x2", "44,0": "wood_wall_8::obstacle", "44,1": "wood_wall_3::obstacle", "44,2": "living_room_floor/6 2-floor-grey-2x2", "44,3": "living_room_floor/6 2-floor-grey-2x2", "44,4": "living_room_floor/6 2-floor-grey-2x2", "44,5": "living_room_floor/6 2-floor-grey-2x2", "44,6": "living_room_floor/6 2-floor-grey-2x2", "44,7": "living_room_floor/6 2-floor-grey-2x2", "44,8": "living_room_floor/6 2-floor-grey-2x2", "44,9": "living_room_floor/6 2-floor-grey-2x2", "45,0": "wood_wall_8::obstacle", "45,1": "wood_wall_3::obstacle", "45,2": "living_room_floor/6 2-floor-grey-2x2", "45,3": "living_room_floor/6 2-floor-grey-2x2", "45,4": "living_room_floor/6 2-floor-grey-2x2", "45,5": "living_room_floor/6 2-floor-grey-2x2", "45,6": "living_room_floor/6 2-floor-grey-2x2", "45,7": "living_room_floor/6 2-floor-grey-2x2", "45,8": "living_room_floor/6 2-floor-grey-2x2", "45,9": "living_room_floor/6 2-floor-grey-2x2", "46,0": "wood_wall_17::obstacle", "46,1": "wood_wall_7::obstacle", "46,2": "wood_wall_7::obstacle", "46,3": "wood_wall_7::obstacle", "46,4": "wood_wall_7::obstacle", "46,5": "wood_wall_7::obstacle", "46,6": "wood_wall_7::obstacle", "46,7": "wood_wall_7::obstacle", "46,8": "wood_wall_7::obstacle", "46,9": "wood_wall_7::obstacle", "47,0": "grass_4", "47,1": "grass_4", "47,2": "grass_4", "47,3": "grass_4", "47,4": "grass_4", "47,5": "grass_4", "47,6": "grass_4", "47,7": "grass_4", "47,8": "grass_4", "47,9": "grass_4", "5,10": "living_room_floor/sprite-4-1-18-2x2", "5,11": "living_room_floor/sprite-4-1-18-2x2", "5,12": "living_room_floor/sprite-4-1-18-2x2", "5,13": "living_room_floor/sprite-4-1-18-2x2", "5,14": "living_room_floor/sprite-4-1-18-2x2", "5,15": "wood_wall_8::obstacle", "5,16": "wood_5", "5,17": "wood_5", "5,18": "wood_5", "5,19": "wood_5", "5,20": "wood_5", "5,21": "wood_5", "5,22": "wood_5", "5,23": "wood_5", "5,24": "wood_5", "5,25": "wood_5", "5,26": "wood_5", "5,27": "wood_5", "5,28": "wood_5", "5,29": "wood_5", "5,30": "glass_1::obstacle", "5,31": "stone_5", "5,32": "stone_5", "5,33": "stone_5", "5,34": "stone_5", "5,35": "stone_5", "6,10": "living_room_floor/sprite-4-1-18-2x2", "6,11": "living_room_floor/sprite-4-1-18-2x2", "6,12": "living_room_floor/sprite-4-1-18-2x2", "6,13": "living_room_floor/sprite-4-1-18-2x2", "6,14": "living_room_floor/sprite-4-1-18-2x2", "6,15": "wood_wall_8::obstacle", "6,16": "wood_5", "6,17": "wood_5", "6,18": "wood_5", "6,19": "wood_5", "6,20": "wood_5", "6,21": "wood_5", "6,22": "wood_5", "6,23": "wood_5", "6,24": "wood_5", "6,25": "wood_5", "6,26": "wood_5", "6,27": "wood_5", "6,28": "wood_5", "6,29": "wood_5", "6,30": "glass_1::obstacle", "6,31": "stone_5", "6,32": "stone_5", "6,33": "stone_5", "6,34": "stone_5", "6,35": "stone_5", "7,10": "living_room_floor/sprite-4-1-18-2x2", "7,11": "living_room_floor/sprite-4-1-18-2x2", "7,12": "living_room_floor/sprite-4-1-18-2x2", "7,13": "living_room_floor/sprite-4-1-18-2x2", "7,14": "living_room_floor/sprite-4-1-18-2x2", "7,15": "wood_wall_8::obstacle", "7,16": "wood_5", "7,17": "wood_5", "7,18": "wood_5", "7,19": "wood_5", "7,20": "wood_5", "7,21": "wood_5", "7,22": "wood_5", "7,23": "wood_5", "7,24": "wood_5", "7,25": "wood_5", "7,26": "wood_5", "7,27": "wood_5", "7,28": "wood_5", "7,29": "wood_5", "7,30": "glass_1::obstacle", "7,31": "stone_5", "7,32": "stone_5", "7,33": "stone_5", "7,34": "stone_5", "7,35": "stone_5", "8,10": "living_room_floor/sprite-4-1-18-2x2", "8,11": "living_room_floor/sprite-4-1-18-2x2", "8,12": "living_room_floor/sprite-4-1-18-2x2", "8,13": "living_room_floor/sprite-4-1-18-2x2", "8,14": "living_room_floor/sprite-4-1-18-2x2", "8,15": "wood_wall_8::obstacle", "8,16": "wood_5", "8,17": "wood_5", "8,18": "wood_5", "8,19": "wood_5", "8,20": "wood_5", "8,21": "wood_5", "8,22": "wood_5", "8,23": "wood_5", "8,24": "wood_5", "8,25": "wood_5", "8,26": "wood_5", "8,27": "wood_5", "8,28": "wood_5", "8,29": "wood_5", "8,30": "glass_1::obstacle", "8,31": "stone_5", "8,32": "stone_5", "8,33": "stone_5", "8,34": "stone_5", "8,35": "stone_5", "9,10": "living_room_floor/sprite-4-1-18-2x2", "9,11": "living_room_floor/sprite-4-1-18-2x2", "9,12": "living_room_floor/sprite-4-1-18-2x2", "9,13": "living_room_floor/sprite-4-1-18-2x2", "9,14": "living_room_floor/sprite-4-1-18-2x2", "9,15": "wood_wall_8::obstacle", "9,16": "wood_5", "9,17": "wood_5", "9,18": "wood_5", "9,19": "wood_5", "9,20": "wood_5", "9,21": "wood_5", "9,22": "wood_5", "9,23": "wood_5", "9,24": "wood_5", "9,25": "wood_5", "9,26": "wood_5", "9,27": "wood_5", "9,28": "wood_5", "9,29": "wood_5", "9,30": "glass_1::obstacle", "9,31": "stone_5", "9,32": "stone_5", "9,33": "stone_5", "9,34": "stone_5", "9,35": "stone_5", "10,10": "living_room_floor/sprite-4-1-18-2x2", "10,11": "living_room_floor/sprite-4-1-18-2x2", "10,12": "living_room_floor/sprite-4-1-18-2x2", "10,13": "living_room_floor/sprite-4-1-18-2x2", "10,14": "living_room_floor/sprite-4-1-18-2x2", "10,15": "wood_wall_8::obstacle", "10,16": "wood_5", "10,17": "wood_5", "10,18": "wood_5", "10,19": "wood_5", "10,20": "wood_5", "10,21": "wood_5", "10,22": "wood_5", "10,23": "wood_5", "10,24": "wood_5", "10,25": "wood_5", "10,26": "wood_5", "10,27": "wood_5", "10,28": "wood_5", "10,29": "wood_5", "10,30": "glass_1::obstacle", "10,31": "stone_5", "10,32": "stone_5", "10,33": "stone_5", "10,34": "stone_5", "10,35": "stone_5", "11,10": "living_room_floor/sprite-4-1-18-2x2", "11,11": "living_room_floor/sprite-4-1-18-2x2", "11,12": "living_room_floor/sprite-4-1-18-2x2", "11,13": "living_room_floor/sprite-4-1-18-2x2", "11,14": "living_room_floor/sprite-4-1-18-2x2", "11,15": "wood_wall_9::obstacle", "11,16": "wood_5", "11,17": "wood_5", "11,18": "wood_5", "11,19": "wood_5", "11,20": "wood_5", "11,21": "wood_5", "11,22": "wood_5", "11,23": "wood_5", "11,24": "wood_5", "11,25": "wood_5", "11,26": "wood_5", "11,27": "wood_5", "11,28": "wood_5", "11,29": "wood_5", "11,30": "glass_1::obstacle", "11,31": "stone_5", "11,32": "stone_5", "11,33": "stone_5", "11,34": "stone_5", "11,35": "stone_5", "12,10": "living_room_floor/sprite-4-1-18-2x2", "12,11": "living_room_floor/sprite-4-1-18-2x2", "12,12": "living_room_floor/sprite-4-1-18-2x2", "12,13": "living_room_floor/sprite-4-1-18-2x2", "12,14": "living_room_floor/sprite-4-1-18-2x2", "12,15": "wood_5", "12,16": "wood_5", "12,17": "wood_5", "12,18": "wood_5", "12,19": "wood_5", "12,20": "wood_5", "12,21": "wood_5", "12,22": "wood_5", "12,23": "wood_5", "12,24": "wood_5", "12,25": "wood_5", "12,26": "wood_5", "12,27": "wood_5", "12,28": "wood_5", "12,29": "wood_5", "12,30": "glass_1::obstacle", "12,31": "stone_5", "12,32": "stone_5", "12,33": "stone_5", "12,34": "stone_5", "12,35": "stone_5", "13,10": "living_room_floor/sprite-4-1-18-2x2", "13,11": "living_room_floor/sprite-4-1-18-2x2", "13,12": "living_room_floor/sprite-4-1-18-2x2", "13,13": "living_room_floor/sprite-4-1-18-2x2", "13,14": "living_room_floor/sprite-4-1-18-2x2", "13,15": "wood_5", "13,16": "wood_5", "13,17": "wood_5", "13,18": "wood_5", "13,19": "wood_5", "13,20": "wood_5", "13,21": "wood_5", "13,22": "wood_5", "13,23": "wood_5", "13,24": "wood_5", "13,25": "wood_5", "13,26": "wood_5", "13,27": "wood_5", "13,28": "wood_5", "13,29": "wood_5", "13,30": "glass_1::obstacle", "13,31": "stone_5", "13,32": "stone_5", "13,33": "stone_5", "13,34": "stone_5", "13,35": "stone_5", "14,10": "living_room_floor/sprite-4-1-18-2x2", "14,11": "living_room_floor/sprite-4-1-18-2x2", "14,12": "living_room_floor/sprite-4-1-18-2x2", "14,13": "living_room_floor/sprite-4-1-18-2x2", "14,14": "living_room_floor/sprite-4-1-18-2x2", "14,15": "wood_5", "14,16": "wood_5", "14,17": "wood_5", "14,18": "wood_5", "14,19": "wood_5", "14,20": "wood_5", "14,21": "wood_5", "14,22": "wood_5", "14,23": "wood_5", "14,24": "wood_5", "14,25": "wood_5", "14,26": "wood_5", "14,27": "wood_5", "14,28": "wood_5", "14,29": "wood_5", "14,30": "glass_1::obstacle", "14,31": "stone_5", "14,32": "stone_5", "14,33": "stone_5", "14,34": "stone_5", "14,35": "stone_5", "15,10": "living_room_floor/sprite-4-1-18-2x2", "15,11": "living_room_floor/sprite-4-1-18-2x2", "15,12": "living_room_floor/sprite-4-1-18-2x2", "15,13": "living_room_floor/sprite-4-1-18-2x2", "15,14": "living_room_floor/sprite-4-1-18-2x2", "15,15": "wood_wall_10::obstacle", "15,16": "wood_5", "15,17": "wood_5", "15,18": "wood_5", "15,19": "wood_5", "15,20": "wood_5", "15,21": "wood_5", "15,22": "wood_5", "15,23": "wood_5", "15,24": "wood_5", "15,25": "wood_5", "15,26": "wood_5", "15,27": "wood_5", "15,28": "wood_5", "15,29": "wood_5", "15,30": "glass_1::obstacle", "15,31": "stone_5", "15,32": "stone_5", "15,33": "stone_5", "15,34": "stone_5", "15,35": "stone_5", "16,10": "living_room_floor/sprite-4-1-18-2x2", "16,11": "living_room_floor/sprite-4-1-18-2x2", "16,12": "living_room_floor/sprite-4-1-18-2x2", "16,13": "living_room_floor/sprite-4-1-18-2x2", "16,14": "living_room_floor/sprite-4-1-18-2x2", "16,15": "wood_wall_8::obstacle", "16,16": "wood_5", "16,17": "wood_5", "16,18": "wood_5", "16,19": "wood_5", "16,20": "wood_5", "16,21": "wood_5", "16,22": "wood_5", "16,23": "wood_5", "16,24": "wood_5", "16,25": "wood_5", "16,26": "wood_5", "16,27": "wood_5", "16,28": "wood_5", "16,29": "wood_5", "16,30": "glass_1::obstacle", "16,31": "stone_5", "16,32": "stone_5", "16,33": "stone_5", "16,34": "stone_5", "16,35": "stone_5", "17,10": "living_room_floor/sprite-4-1-18-2x2", "17,11": "living_room_floor/sprite-4-1-18-2x2", "17,12": "living_room_floor/sprite-4-1-18-2x2", "17,13": "living_room_floor/sprite-4-1-18-2x2", "17,14": "living_room_floor/sprite-4-1-18-2x2", "17,15": "wood_wall_8::obstacle", "17,16": "wood_5", "17,17": "wood_5", "17,18": "wood_5", "17,19": "wood_5", "17,20": "wood_5", "17,21": "wood_5", "17,22": "wood_5", "17,23": "wood_5", "17,24": "wood_5", "17,25": "wood_5", "17,26": "wood_5", "17,27": "wood_5", "17,28": "wood_5", "17,29": "wood_5", "17,30": "glass_1::obstacle", "17,31": "stone_5", "17,32": "stone_5", "17,33": "stone_5", "17,34": "stone_5", "17,35": "stone_5", "18,10": "wood_wall_5::obstacle", "18,11": "wood_3", "18,12": "wood_3", "18,13": "wood_3", "18,14": "wood_3", "18,15": "wood_wall_8::obstacle", "18,16": "wood_5", "18,17": "wood_5", "18,18": "wood_5", "18,19": "wood_5", "18,20": "wood_5", "18,21": "wood_5", "18,22": "wood_5", "18,23": "wood_5", "18,24": "wood_5", "18,25": "wood_5", "18,26": "wood_5", "18,27": "wood_5", "18,28": "wood_5", "18,29": "wood_5", "18,30": "glass_1::obstacle", "18,31": "stone_5", "18,32": "stone_5", "18,33": "stone_5", "18,34": "stone_5", "18,35": "stone_5", "19,10": "wood_3", "19,11": "wood_3", "19,12": "wood_3", "19,13": "wood_3", "19,14": "wood_3", "19,15": "wood_wall_8::obstacle", "19,16": "wood_5", "19,17": "wood_5", "19,18": "wood_5", "19,19": "wood_5", "19,20": "wood_5", "19,21": "wood_5", "19,22": "wood_5", "19,23": "wood_5", "19,24": "wood_5", "19,25": "wood_5", "19,26": "wood_5", "19,27": "wood_5", "19,28": "wood_5", "19,29": "wood_5", "19,30": "glass_1::obstacle", "19,31": "stone_5", "19,32": "stone_5", "19,33": "stone_5", "19,34": "stone_5", "19,35": "stone_5", "20,10": "wood_3", "20,11": "wood_3", "20,12": "wood_3", "20,13": "wood_3", "20,14": "wood_3", "20,15": "wood_wall_8::obstacle", "20,16": "wood_5", "20,17": "wood_5", "20,18": "wood_5", "20,19": "wood_5", "20,20": "wood_5", "20,21": "wood_5", "20,22": "wood_5", "20,23": "wood_5", "20,24": "wood_5", "20,25": "wood_5", "20,26": "wood_5", "20,27": "wood_5", "20,28": "wood_5", "20,29": "wood_5", "20,30": "glass_1::obstacle", "20,31": "stone_5", "20,32": "stone_5", "20,33": "stone_5", "20,34": "stone_5", "20,35": "stone_5", "21,10": "wood_3", "21,11": "wood_3", "21,12": "wood_3", "21,13": "wood_3", "21,14": "wood_3", "21,15": "wood_wall_8::obstacle", "21,16": "wood_5", "21,17": "wood_5", "21,18": "wood_5", "21,19": "wood_5", "21,20": "wood_5", "21,21": "wood_5", "21,22": "wood_5", "21,23": "wood_5", "21,24": "wood_5", "21,25": "wood_5", "21,26": "wood_5", "21,27": "wood_5", "21,28": "wood_5", "21,29": "wood_5", "21,30": "glass_1::obstacle", "21,31": "stone_5", "21,32": "stone_5", "21,33": "stone_5", "21,34": "stone_5", "21,35": "stone_5", "22,10": "wood_3", "22,11": "wood_3", "22,12": "wood_3", "22,13": "wood_3", "22,14": "wood_3", "22,15": "wood_wall_9::obstacle", "22,16": "wood_5", "22,17": "wood_5", "22,18": "wood_5", "22,19": "wood_5", "22,20": "wood_5", "22,21": "wood_5", "22,22": "wood_5", "22,23": "wood_5", "22,24": "wood_5", "22,25": "wood_5", "22,26": "wood_5", "22,27": "wood_5", "22,28": "wood_5", "22,29": "wood_5", "22,30": "wood_5::glass_3@0::obstacle", "22,31": "stone_2", "22,32": "stone_2", "22,33": "stone_2", "22,34": "stone_2", "22,35": "stone_2", "23,10": "wood_3", "23,11": "wood_3", "23,12": "wood_3", "23,13": "wood_3", "23,14": "wood_3", "23,15": "wood_5", "23,16": "wood_5", "23,17": "wood_5", "23,18": "wood_5", "23,19": "wood_5", "23,20": "wood_5", "23,21": "wood_5", "23,22": "wood_5", "23,23": "wood_5", "23,24": "wood_5", "23,25": "wood_5", "23,26": "wood_5", "23,27": "wood_5", "23,28": "wood_5", "23,29": "wood_5", "23,30": "wood_5", "23,31": "stone_2", "23,32": "stone_2", "23,33": "stone_2", "23,34": "stone_2", "23,35": "stone_2", "24,10": "wood_3", "24,11": "wood_3", "24,12": "wood_3", "24,13": "wood_3", "24,14": "wood_3", "24,15": "wood_5", "24,16": "wood_5", "24,17": "wood_5", "24,18": "wood_5", "24,19": "wood_5", "24,20": "wood_5", "24,21": "wood_5", "24,22": "wood_5", "24,23": "wood_5", "24,24": "wood_5", "24,25": "wood_5", "24,26": "wood_5", "24,27": "wood_5", "24,28": "wood_5", "24,29": "wood_5", "24,30": "wood_5", "24,31": "stone_2", "24,32": "stone_2", "24,33": "stone_2", "24,34": "stone_2", "24,35": "stone_2", "25,10": "wood_3", "25,11": "wood_3", "25,12": "wood_3", "25,13": "wood_3", "25,14": "wood_3", "25,15": "wood_5", "25,16": "wood_5", "25,17": "wood_5", "25,18": "wood_5", "25,19": "wood_5", "25,20": "wood_5", "25,21": "wood_5", "25,22": "wood_5", "25,23": "wood_5", "25,24": "wood_5", "25,25": "wood_5", "25,26": "wood_5", "25,27": "wood_5", "25,28": "wood_5", "25,29": "wood_5", "25,30": "wood_5::glass_4@0::obstacle", "25,31": "stone_2", "25,32": "stone_2", "25,33": "stone_2", "25,34": "stone_2", "25,35": "stone_2", "26,10": "wood_3", "26,11": "wood_3", "26,12": "wood_3", "26,13": "wood_3", "26,14": "wood_3", "26,15": "wood_5", "26,16": "wood_5", "26,17": "wood_5", "26,18": "wood_5", "26,19": "wood_5", "26,20": "wood_5", "26,21": "wood_5", "26,22": "wood_5", "26,23": "wood_5", "26,24": "wood_5", "26,25": "wood_5", "26,26": "wood_5", "26,27": "wood_5", "26,28": "wood_5", "26,29": "wood_5", "26,30": "glass_1::obstacle", "26,31": "stone_5", "26,32": "stone_5", "26,33": "stone_5", "26,34": "stone_5", "26,35": "stone_5", "27,10": "wood_3", "27,11": "wood_3", "27,12": "wood_3", "27,13": "wood_3", "27,14": "wood_3", "27,15": "wood_wall_10::obstacle", "27,16": "wood_5::glass_4@0::obstacle", "27,17": "wood_5::glass_4@0::obstacle", "27,18": "carpet_5", "27,19": "carpet_5", "27,20": "wood_5::glass_4@0::obstacle", "27,21": "wood_5::glass_4@0::obstacle", "27,22": "wood_5::glass_4@0::obstacle", "27,23": "wood_wall_10::obstacle", "27,24": "wood_5::glass_4@0::obstacle", "27,25": "wood_5::glass_4@0::obstacle", "27,26": "grass_1", "27,27": "grass_1", "27,28": "wood_5::glass_4@0::obstacle", "27,29": "wood_5::glass_4@0::obstacle", "27,30": "glass_1::obstacle", "27,31": "stone_5", "27,32": "stone_5", "27,33": "stone_5", "27,34": "stone_5", "27,35": "stone_5", "28,10": "wood_3", "28,11": "wood_3", "28,12": "wood_3", "28,13": "wood_3", "28,14": "wood_3", "28,15": "wood_wall_8::obstacle", "28,16": "carpet_5", "28,17": "carpet_5", "28,18": "carpet_5", "28,19": "carpet_5", "28,20": "carpet_5", "28,21": "carpet_5", "28,22": "carpet_5", "28,23": "wood_wall_8::obstacle", "28,24": "grass_1", "28,25": "grass_1", "28,26": "grass_1", "28,27": "grass_1", "28,28": "grass_1", "28,29": "grass_1", "28,30": "glass_1::obstacle", "28,31": "stone_5", "28,32": "stone_5", "28,33": "stone_5", "28,34": "stone_5", "28,35": "stone_5", "29,10": "wood_3", "29,11": "wood_3", "29,12": "wood_3", "29,13": "wood_3", "29,14": "wood_3", "29,15": "wood_wall_8::obstacle", "29,16": "carpet_5", "29,17": "carpet_5", "29,18": "carpet_5", "29,19": "carpet_5", "29,20": "carpet_5", "29,21": "carpet_5", "29,22": "carpet_5", "29,23": "wood_wall_8::obstacle", "29,24": "grass_1", "29,25": "grass_1", "29,26": "grass_1", "29,27": "grass_1", "29,28": "grass_1", "29,29": "grass_1", "29,30": "glass_1::obstacle", "29,31": "stone_5", "29,32": "stone_5", "29,33": "stone_5", "29,34": "stone_5", "29,35": "stone_5", "30,10": "living_room_floor/6 2-floor-grey-2x2", "30,11": "living_room_floor/6 2-floor-grey-2x2", "30,12": "wood_wall_10::obstacle", "30,13": "living_room_floor/sprite-4-1-22-2x2", "30,14": "living_room_floor/sprite-4-1-22-2x2", "30,15": "wood_wall_8::obstacle", "30,16": "carpet_5", "30,17": "carpet_5", "30,18": "carpet_5", "30,19": "carpet_5", "30,20": "carpet_5", "30,21": "carpet_5", "30,22": "carpet_5", "30,23": "wood_wall_8::obstacle", "30,24": "grass_1", "30,25": "grass_1", "30,26": "grass_1", "30,27": "grass_1", "30,28": "grass_1", "30,29": "grass_1", "30,30": "glass_1::obstacle", "30,31": "stone_5", "30,32": "stone_5", "30,33": "stone_5", "30,34": "stone_5", "30,35": "stone_5", "31,10": "living_room_floor/6 2-floor-grey-2x2", "31,11": "living_room_floor/6 2-floor-grey-2x2", "31,12": "wood_wall_8::obstacle", "31,13": "living_room_floor/sprite-4-1-22-2x2", "31,14": "living_room_floor/sprite-4-1-22-2x2", "31,15": "wood_wall_8::obstacle", "31,16": "carpet_5", "31,17": "carpet_5", "31,18": "carpet_5", "31,19": "carpet_5", "31,20": "carpet_5", "31,21": "carpet_5", "31,22": "carpet_5", "31,23": "wood_wall_8::obstacle", "31,24": "grass_1", "31,25": "grass_1", "31,26": "grass_1", "31,27": "grass_1", "31,28": "grass_1", "31,29": "grass_1", "31,30": "glass_1::obstacle", "31,31": "stone_5", "31,32": "stone_5", "31,33": "stone_5", "31,34": "stone_5", "31,35": "stone_5", "32,10": "living_room_floor/6 2-floor-grey-2x2", "32,11": "living_room_floor/6 2-floor-grey-2x2", "32,12": "wood_wall_8::obstacle", "32,13": "living_room_floor/sprite-4-1-22-2x2", "32,14": "living_room_floor/sprite-4-1-22-2x2", "32,15": "wood_wall_8::obstacle", "32,16": "carpet_5", "32,17": "carpet_5", "32,18": "carpet_5", "32,19": "carpet_5", "32,20": "carpet_5", "32,21": "carpet_5", "32,22": "carpet_5", "32,23": "wood_wall_8::obstacle", "32,24": "grass_1", "32,25": "grass_1", "32,26": "grass_1", "32,27": "grass_1", "32,28": "grass_1", "32,29": "grass_1", "32,30": "glass_1::obstacle", "32,31": "stone_5", "32,32": "stone_5", "32,33": "stone_5", "32,34": "stone_5", "32,35": "stone_5", "33,10": "living_room_floor/6 2-floor-grey-2x2", "33,11": "living_room_floor/6 2-floor-grey-2x2", "33,12": "wood_wall_8::obstacle", "33,13": "living_room_floor/sprite-4-1-22-2x2", "33,14": "living_room_floor/sprite-4-1-22-2x2", "33,15": "wood_wall_8::obstacle", "33,16": "carpet_5", "33,17": "carpet_5", "33,18": "carpet_5", "33,19": "carpet_5", "33,20": "carpet_5", "33,21": "carpet_5", "33,22": "carpet_5", "33,23": "wood_wall_8::obstacle", "33,24": "grass_1", "33,25": "grass_1", "33,26": "grass_1", "33,27": "grass_1", "33,28": "grass_1", "33,29": "grass_1", "33,30": "glass_1::obstacle", "33,31": "stone_5", "33,32": "stone_5", "33,33": "stone_5", "33,34": "stone_5", "33,35": "stone_5", "34,10": "living_room_floor/6 2-floor-grey-2x2", "34,11": "living_room_floor/6 2-floor-grey-2x2", "34,12": "wood_wall_8::obstacle", "34,13": "living_room_floor/sprite-4-1-22-2x2", "34,14": "living_room_floor/sprite-4-1-22-2x2", "34,15": "wood_wall_8::obstacle", "34,16": "carpet_5", "34,17": "carpet_5", "34,18": "carpet_5", "34,19": "carpet_5", "34,20": "carpet_5", "34,21": "carpet_5", "34,22": "carpet_5", "34,23": "wood_wall_8::obstacle", "34,24": "grass_1", "34,25": "grass_1", "34,26": "grass_1", "34,27": "grass_1", "34,28": "grass_1", "34,29": "grass_1", "34,30": "glass_1::obstacle", "34,31": "stone_5", "34,32": "stone_5", "34,33": "stone_5", "34,34": "stone_5", "34,35": "stone_5", "35,10": "living_room_floor/6 2-floor-grey-2x2", "35,11": "living_room_floor/6 2-floor-grey-2x2", "35,12": "wood_wall_8::obstacle", "35,13": "living_room_floor/sprite-4-1-22-2x2", "35,14": "living_room_floor/sprite-4-1-22-2x2", "35,15": "wood_wall_8::obstacle", "35,16": "carpet_5", "35,17": "carpet_5", "35,18": "carpet_5", "35,19": "carpet_5", "35,20": "carpet_5", "35,21": "carpet_5", "35,22": "carpet_5", "35,23": "wood_wall_8::obstacle", "35,24": "grass_1", "35,25": "grass_1", "35,26": "grass_1", "35,27": "grass_1", "35,28": "grass_1", "35,29": "grass_1", "35,30": "glass_1::obstacle", "35,31": "stone_5", "35,32": "stone_5", "35,33": "stone_5", "35,34": "stone_5", "35,35": "stone_5", "36,10": "living_room_floor/6 2-floor-grey-2x2", "36,11": "living_room_floor/6 2-floor-grey-2x2", "36,12": "wood_wall_8::obstacle", "36,13": "living_room_floor/sprite-4-1-22-2x2", "36,14": "living_room_floor/sprite-4-1-22-2x2", "36,15": "wood_wall_8::obstacle", "36,16": "carpet_5", "36,17": "carpet_5", "36,18": "carpet_5", "36,19": "carpet_5", "36,20": "carpet_5", "36,21": "carpet_5", "36,22": "carpet_5", "36,23": "wood_wall_8::obstacle", "36,24": "grass_1", "36,25": "grass_1", "36,26": "grass_1", "36,27": "grass_1", "36,28": "grass_1", "36,29": "grass_1", "36,30": "glass_1::obstacle", "36,31": "stone_5", "36,32": "stone_5", "36,33": "stone_5", "36,34": "stone_5", "36,35": "stone_5", "37,10": "living_room_floor/6 2-floor-grey-2x2", "37,11": "living_room_floor/6 2-floor-grey-2x2", "37,12": "wood_wall_8::obstacle", "37,13": "living_room_floor/sprite-4-1-22-2x2", "37,14": "living_room_floor/sprite-4-1-22-2x2", "37,15": "wood_wall_9::obstacle", "37,16": "living_room_floor/sprite-4-1-22-2x2::glass_4@0::obstacle", "37,17": "living_room_floor/sprite-4-1-22-2x2::glass_4@0::obstacle", "37,18": "living_room_floor/sprite-4-1-22-2x2::glass_4@0::obstacle", "37,19": "living_room_floor/sprite-4-1-22-2x2::glass_4@0::obstacle", "37,20": "living_room_floor/sprite-4-1-22-2x2::glass_4@0::obstacle", "37,21": "living_room_floor/sprite-4-1-22-2x2", "37,22": "living_room_floor/sprite-4-1-22-2x2", "37,23": "wood_wall_15::obstacle", "37,24": "living_room_floor/sprite-4-1-22-2x2::glass_4@0::obstacle", "37,25": "living_room_floor/sprite-4-1-22-2x2::glass_4@0::obstacle", "37,26": "living_room_floor/sprite-4-1-22-2x2::glass_4@0::obstacle", "37,27": "living_room_floor/sprite-4-1-22-2x2::glass_4@0::obstacle", "37,28": "living_room_floor/sprite-4-1-22-2x2::glass_4@0::obstacle", "37,29": "living_room_floor/sprite-4-1-22-2x2::glass_4@0::obstacle", "37,30": "glass_1::obstacle", "37,31": "stone_5", "37,32": "stone_5", "37,33": "stone_5", "37,34": "stone_5", "37,35": "stone_5", "38,10": "living_room_floor/6 2-floor-grey-2x2", "38,11": "living_room_floor/6 2-floor-grey-2x2", "38,12": "wood_wall_8::obstacle", "38,13": "living_room_floor/sprite-4-1-22-2x2", "38,14": "living_room_floor/sprite-4-1-22-2x2", "38,15": "living_room_floor/sprite-4-1-22-2x2", "38,16": "living_room_floor/sprite-4-1-22-2x2", "38,17": "living_room_floor/sprite-4-1-22-2x2", "38,18": "living_room_floor/sprite-4-1-22-2x2", "38,19": "living_room_floor/sprite-4-1-22-2x2", "38,20": "living_room_floor/sprite-4-1-22-2x2", "38,21": "living_room_floor/sprite-4-1-22-2x2", "38,22": "living_room_floor/sprite-4-1-22-2x2", "38,23": "living_room_floor/sprite-4-1-22-2x2", "38,24": "living_room_floor/sprite-4-1-22-2x2", "38,25": "living_room_floor/sprite-4-1-22-2x2", "38,26": "living_room_floor/sprite-4-1-22-2x2", "38,27": "living_room_floor/sprite-4-1-22-2x2", "38,28": "living_room_floor/sprite-4-1-22-2x2", "38,29": "living_room_floor/sprite-4-1-22-2x2", "38,30": "glass_1::obstacle", "38,31": "stone_5", "38,32": "stone_5", "38,33": "stone_5", "38,34": "stone_5", "38,35": "stone_5", "39,10": "living_room_floor/6 2-floor-grey-2x2", "39,11": "living_room_floor/6 2-floor-grey-2x2", "39,12": "wood_wall_8::obstacle", "39,13": "living_room_floor/sprite-4-1-22-2x2", "39,14": "living_room_floor/sprite-4-1-22-2x2", "39,15": "living_room_floor/sprite-4-1-22-2x2", "39,16": "living_room_floor/sprite-4-1-22-2x2", "39,17": "living_room_floor/sprite-4-1-22-2x2", "39,18": "living_room_floor/sprite-4-1-22-2x2", "39,19": "living_room_floor/sprite-4-1-22-2x2", "39,20": "living_room_floor/sprite-4-1-22-2x2", "39,21": "living_room_floor/sprite-4-1-22-2x2", "39,22": "living_room_floor/sprite-4-1-22-2x2", "39,23": "living_room_floor/sprite-4-1-22-2x2", "39,24": "living_room_floor/sprite-4-1-22-2x2", "39,25": "living_room_floor/sprite-4-1-22-2x2", "39,26": "living_room_floor/sprite-4-1-22-2x2", "39,27": "living_room_floor/sprite-4-1-22-2x2", "39,28": "living_room_floor/sprite-4-1-22-2x2", "39,29": "living_room_floor/sprite-4-1-22-2x2", "39,30": "glass_1::obstacle", "39,31": "stone_5", "39,32": "stone_5", "39,33": "stone_5", "39,34": "stone_5", "39,35": "stone_5", "40,10": "living_room_floor/6 2-floor-grey-2x2", "40,11": "living_room_floor/6 2-floor-grey-2x2", "40,12": "wood_wall_9::obstacle", "40,13": "living_room_floor/sprite-4-1-22-2x2", "40,14": "living_room_floor/sprite-4-1-22-2x2", "40,15": "living_room_floor/sprite-4-1-22-2x2", "40,16": "living_room_floor/sprite-4-1-22-2x2", "40,17": "living_room_floor/sprite-4-1-22-2x2", "40,18": "living_room_floor/sprite-4-1-22-2x2", "40,19": "living_room_floor/sprite-4-1-22-2x2", "40,20": "living_room_floor/sprite-4-1-22-2x2", "40,21": "living_room_floor/sprite-4-1-22-2x2", "40,22": "living_room_floor/sprite-4-1-22-2x2", "40,23": "living_room_floor/sprite-4-1-22-2x2", "40,24": "living_room_floor/sprite-4-1-22-2x2", "40,25": "living_room_floor/sprite-4-1-22-2x2", "40,26": "living_room_floor/sprite-4-1-22-2x2", "40,27": "living_room_floor/sprite-4-1-22-2x2", "40,28": "living_room_floor/sprite-4-1-22-2x2", "40,29": "living_room_floor/sprite-4-1-22-2x2", "40,30": "glass_1::obstacle", "40,31": "stone_5", "40,32": "stone_5", "40,33": "stone_5", "40,34": "stone_5", "40,35": "stone_5", "41,10": "living_room_floor/6 2-floor-grey-2x2", "41,11": "living_room_floor/6 2-floor-grey-2x2", "41,12": "living_room_floor/sprite-4-1-22-2x2", "41,13": "living_room_floor/sprite-4-1-22-2x2", "41,14": "living_room_floor/sprite-4-1-22-2x2", "41,15": "living_room_floor/sprite-4-1-22-2x2", "41,16": "living_room_floor/sprite-4-1-22-2x2", "41,17": "living_room_floor/sprite-4-1-22-2x2", "41,18": "living_room_floor/sprite-4-1-22-2x2", "41,19": "living_room_floor/sprite-4-1-22-2x2", "41,20": "living_room_floor/sprite-4-1-22-2x2", "41,21": "living_room_floor/sprite-4-1-22-2x2", "41,22": "living_room_floor/sprite-4-1-22-2x2", "41,23": "living_room_floor/sprite-4-1-22-2x2", "41,24": "living_room_floor/sprite-4-1-22-2x2", "41,25": "living_room_floor/sprite-4-1-22-2x2", "41,26": "living_room_floor/sprite-4-1-22-2x2", "41,27": "living_room_floor/sprite-4-1-22-2x2", "41,28": "living_room_floor/sprite-4-1-22-2x2", "41,29": "living_room_floor/sprite-4-1-22-2x2", "41,30": "glass_1::obstacle", "41,31": "stone_5", "41,32": "stone_5", "41,33": "stone_5", "41,34": "stone_5", "41,35": "stone_5", "42,10": "living_room_floor/6 2-floor-grey-2x2", "42,11": "living_room_floor/6 2-floor-grey-2x2", "42,12": "living_room_floor/sprite-4-1-22-2x2", "42,13": "living_room_floor/sprite-4-1-22-2x2", "42,14": "living_room_floor/sprite-4-1-22-2x2", "42,15": "living_room_floor/sprite-4-1-22-2x2", "42,16": "living_room_floor/sprite-4-1-22-2x2", "42,17": "living_room_floor/sprite-4-1-22-2x2", "42,18": "living_room_floor/sprite-4-1-22-2x2", "42,19": "living_room_floor/sprite-4-1-22-2x2", "42,20": "living_room_floor/sprite-4-1-22-2x2", "42,21": "living_room_floor/sprite-4-1-22-2x2", "42,22": "living_room_floor/sprite-4-1-22-2x2", "42,23": "living_room_floor/sprite-4-1-22-2x2", "42,24": "living_room_floor/sprite-4-1-22-2x2", "42,25": "living_room_floor/sprite-4-1-22-2x2", "42,26": "living_room_floor/sprite-4-1-22-2x2", "42,27": "living_room_floor/sprite-4-1-22-2x2", "42,28": "living_room_floor/sprite-4-1-22-2x2", "42,29": "living_room_floor/sprite-4-1-22-2x2", "42,30": "glass_1::obstacle", "42,31": "stone_5", "42,32": "stone_5", "42,33": "stone_5", "42,34": "stone_5", "42,35": "stone_5", "43,10": "living_room_floor/6 2-floor-grey-2x2", "43,11": "living_room_floor/6 2-floor-grey-2x2", "43,12": "wood_wall_10::obstacle", "43,13": "living_room_floor/sprite-4-1-22-2x2", "43,14": "living_room_floor/sprite-4-1-22-2x2", "43,15": "living_room_floor/sprite-4-1-22-2x2", "43,16": "living_room_floor/sprite-4-1-22-2x2", "43,17": "living_room_floor/sprite-4-1-22-2x2", "43,18": "living_room_floor/sprite-4-1-22-2x2", "43,19": "living_room_floor/sprite-4-1-22-2x2", "43,20": "living_room_floor/sprite-4-1-22-2x2", "43,21": "living_room_floor/sprite-4-1-22-2x2", "43,22": "living_room_floor/sprite-4-1-22-2x2", "43,23": "living_room_floor/sprite-4-1-22-2x2", "43,24": "living_room_floor/sprite-4-1-22-2x2", "43,25": "living_room_floor/sprite-4-1-22-2x2", "43,26": "living_room_floor/sprite-4-1-22-2x2", "43,27": "living_room_floor/sprite-4-1-22-2x2", "43,28": "living_room_floor/sprite-4-1-22-2x2", "43,29": "living_room_floor/sprite-4-1-22-2x2", "43,30": "glass_1::obstacle", "43,31": "stone_5", "43,32": "stone_5", "43,33": "stone_5", "43,34": "stone_5", "43,35": "stone_5", "44,10": "living_room_floor/6 2-floor-grey-2x2", "44,11": "living_room_floor/6 2-floor-grey-2x2", "44,12": "wood_wall_8::obstacle", "44,13": "living_room_floor/sprite-4-1-22-2x2", "44,14": "living_room_floor/sprite-4-1-22-2x2", "44,15": "living_room_floor/sprite-4-1-22-2x2", "44,16": "living_room_floor/sprite-4-1-22-2x2", "44,17": "living_room_floor/sprite-4-1-22-2x2", "44,18": "living_room_floor/sprite-4-1-22-2x2", "44,19": "living_room_floor/sprite-4-1-22-2x2", "44,20": "living_room_floor/sprite-4-1-22-2x2", "44,21": "living_room_floor/sprite-4-1-22-2x2", "44,22": "living_room_floor/sprite-4-1-22-2x2", "44,23": "living_room_floor/sprite-4-1-22-2x2", "44,24": "living_room_floor/sprite-4-1-22-2x2", "44,25": "living_room_floor/sprite-4-1-22-2x2", "44,26": "living_room_floor/sprite-4-1-22-2x2", "44,27": "living_room_floor/sprite-4-1-22-2x2", "44,28": "living_room_floor/sprite-4-1-22-2x2", "44,29": "living_room_floor/sprite-4-1-22-2x2", "44,30": "glass_1::obstacle", "44,31": "stone_5", "44,32": "stone_5", "44,33": "stone_5", "44,34": "stone_5", "44,35": "stone_5", "45,10": "living_room_floor/6 2-floor-grey-2x2", "45,11": "living_room_floor/6 2-floor-grey-2x2", "45,12": "wood_wall_8::obstacle", "45,13": "living_room_floor/sprite-4-1-22-2x2", "45,14": "living_room_floor/sprite-4-1-22-2x2", "45,15": "living_room_floor/sprite-4-1-22-2x2", "45,16": "living_room_floor/sprite-4-1-22-2x2", "45,17": "living_room_floor/sprite-4-1-22-2x2", "45,18": "living_room_floor/sprite-4-1-22-2x2", "45,19": "living_room_floor/sprite-4-1-22-2x2", "45,20": "living_room_floor/sprite-4-1-22-2x2", "45,21": "living_room_floor/sprite-4-1-22-2x2", "45,22": "living_room_floor/sprite-4-1-22-2x2", "45,23": "living_room_floor/sprite-4-1-22-2x2", "45,24": "living_room_floor/sprite-4-1-22-2x2", "45,25": "living_room_floor/sprite-4-1-22-2x2", "45,26": "living_room_floor/sprite-4-1-22-2x2", "45,27": "living_room_floor/sprite-4-1-22-2x2", "45,28": "living_room_floor/sprite-4-1-22-2x2", "45,29": "living_room_floor/sprite-4-1-22-2x2", "45,30": "glass_1::obstacle", "45,31": "stone_5", "45,32": "stone_5", "45,33": "stone_5", "45,34": "stone_5", "45,35": "stone_5", "46,10": "wood_wall_7::obstacle", "46,11": "wood_wall_7::obstacle", "46,12": "wood_wall_15::obstacle", "46,13": "wood_wall_7::obstacle", "46,14": "wood_wall_7::obstacle", "46,15": "wood_wall_7::obstacle", "46,16": "wood_wall_7::obstacle", "46,17": "wood_wall_7::obstacle", "46,18": "wood_wall_7::obstacle", "46,19": "wood_wall_7::obstacle", "46,20": "wood_wall_7::obstacle", "46,21": "wood_wall_7::obstacle", "46,22": "wood_wall_7::obstacle", "46,23": "wood_wall_7::obstacle", "46,24": "wood_wall_7::obstacle", "46,25": "wood_wall_7::obstacle", "46,26": "wood_wall_7::obstacle", "46,27": "wood_wall_7::obstacle", "46,28": "wood_wall_7::obstacle", "46,29": "wood_wall_7::obstacle", "46,30": "wood_wall_5::obstacle", "46,31": "stone_5", "46,32": "stone_5", "46,33": "stone_5", "46,34": "stone_5", "46,35": "stone_5", "47,10": "grass_4", "47,11": "grass_4", "47,12": "grass_4", "47,13": "grass_4", "47,14": "grass_4", "47,15": "grass_4", "47,16": "grass_4", "47,17": "grass_4", "47,18": "grass_4", "47,19": "grass_4", "47,20": "grass_4", "47,21": "grass_4", "47,22": "grass_4", "47,23": "grass_4", "47,24": "grass_4", "47,25": "grass_4", "47,26": "grass_4", "47,27": "grass_4", "47,28": "grass_4", "47,29": "grass_4", "47,30": "grass_4", "47,31": "stone_5", "47,32": "stone_5", "47,33": "stone_5", "47,34": "stone_5", "47,35": "stone_5", "spawn_point": "24,33", "freeform:deco_petshop_001": "office_one/Copy (1) sprite-11-1|none::724,1608::solid::behind::layer:0", "freeform:deco_petshop_002": "office_one/Copy (1) sprite-11-1|none::812,1608::solid::behind::layer:0", "freeform:deco_petshop_003": "office_one/Copy (1) sprite-14-3|none::1008,1598::solid::behind::layer:0", "freeform:deco_petshop_004": "office_one/Copy (1) sprite-14-3|none::1392,1598::solid::behind::layer:0", "freeform:deco_petshop_005": "pet_shop/pet_shop_fire_hydrant|none::1560,1656::solid::behind::layer:0", "freeform:deco_petshop_006": "pet_shop/pet_shop_bike_rack|none::1824,1608::solid::behind::layer:0", "freeform:deco_petshop_007": "office_one/sprite-8-11|none::1200,1564::passable::behind::layer:-1", "freeform:deco_petshop_008": "office_one/sprite-8-11|none::1200,1468::passable::behind::layer:-1", "freeform:deco_petshop_009": "living_room_one/Copy (1) sprite-7-7|none::460,1598::solid::behind::layer:0", "freeform:deco_petshop_010": "living_room_one/Copy (1) sprite-7-7|none::2080,1598::solid::behind::layer:0", "freeform:deco_petshop_011": "office_one/Copy (1) sprite-6-4|none::24,1522::solid::behind::layer:0", "freeform:deco_petshop_012": "office_one/Copy (1) sprite-6-4|none::2376,1522::solid::behind::layer:0", "freeform:deco_petshop_013": "office_one/Copy (1) sprite-7-5|none::24,1000::solid::behind::layer:0", "freeform:deco_petshop_014": "office_one/Copy (1) sprite-7-5|none::2376,1000::solid::behind::layer:0", "freeform:deco_petshop_015": "office_one/Copy (1) sprite-7-5|none::24,500::solid::behind::layer:0", "freeform:deco_petshop_016": "office_one/Copy (1) sprite-7-5|none::2376,500::solid::behind::layer:0", "freeform:deco_petshop_017": "office_one/sprite-9-12|none::805,1392::solid::behind::layer:0::interact:inventory", "freeform:deco_petshop_018": "office_one/sprite-11-1-2|none::905,1398::solid::behind::layer:0::interact:inventory", "freeform:deco_petshop_020": "office_one/Copy (3) sprite-9-2|none::780,1298::solid::behind::layer:0", "freeform:deco_petshop_021": "pet_shop/tile-B-02 13_sprite_222_48x48|none::842,1320::passable::behind::layer:0", "freeform:deco_petshop_023": "pet_shop/pet_shop_gondola_endcap|none::1008,1248::solid::behind::layer:0", "freeform:deco_petshop_025": "pet_shop/pet_shop_gondola_endcap|none::384,944::solid::behind::layer:0", "freeform:deco_petshop_026": "pet_shop/pet_shop_gondola_kibble|none::384,1058::solid::behind::layer:0", "freeform:deco_petshop_027": "pet_shop/pet_shop_gondola_kibble|none::384,1218::solid::behind::layer:0", "freeform:deco_petshop_028": "pet_shop/pet_shop_gondola_endcap|none::624,944::solid::behind::layer:0", "freeform:deco_petshop_029": "pet_shop/pet_shop_gondola_treats|none::624,1058::solid::behind::layer:0", "freeform:deco_petshop_030": "pet_shop/pet_shop_gondola_treats|none::624,1218::solid::behind::layer:0", "freeform:deco_petshop_031": "pet_shop/pet_shop_gondola_endcap|none::864,944::solid::behind::layer:0", "freeform:deco_petshop_032": "pet_shop/pet_shop_gondola_supplies|none::864,1062::solid::behind::layer:0", "freeform:deco_petshop_033": "pet_shop/pet_shop_rack_collars|none::152,922::solid::behind::layer:0", "freeform:deco_petshop_034": "pet_shop/pet_shop_rack_collars|none::152,1032::solid::behind::layer:0", "freeform:deco_petshop_035": "pet_shop/pet_shop_rack_apparel|none::152,1192::solid::behind::layer:0", "freeform:deco_petshop_036": "pet_shop/pet_shop_rack_apparel|none::152,1296::solid::behind::layer:0", "freeform:deco_petshop_037": "pet_shop/tile-B-01 15_sprite_94_48x48|none::216,1458::solid::behind::layer:0", "freeform:deco_petshop_038": "pet_shop/tile-B-01 15_sprite_16_48x48|none::268,1458::solid::behind::layer:0", "freeform:deco_petshop_039": "pet_shop/tile-B-01 15_sprite_52_48x48|none::320,1458::solid::behind::layer:0", "freeform:deco_petshop_040": "pet_shop/tile-B-01 15_sprite_95_48x48|none::372,1458::solid::behind::layer:0", "freeform:deco_petshop_041": "pet_shop/tile-B-01 15_sprite_16_48x48|none::424,1458::solid::behind::layer:0", "freeform:deco_petshop_042": "pet_shop/pet_shop_adoption_kiosk|none::1296,1104::solid::behind::layer:0::interact:calendar", "freeform:deco_petshop_043": "office_one/sprite-8-10|none::1320,950::passable::behind::layer:-1", "freeform:deco_petshop_044": "office_one/sprite-8-10|none::1320,1350::passable::behind::layer:-1", "freeform:deco_petshop_045": "pet_shop/tile-B-01 15_sprite_01_96x144|none::1475,892::solid::behind::layer:0", "freeform:deco_petshop_046": "pet_shop/tile-B-01 15_sprite_02_96x144|none::1776,892::solid::behind::layer:0", "freeform:deco_petshop_047": "pet_shop/tile-B-03 14_sprite_40_96x96|none::1625,882::solid::behind::layer:0", "freeform:deco_petshop_048": "pet_shop/tile-B-04 14_sprite_70_96x96|none::1455,1085::solid::behind::layer:0", "freeform:deco_petshop_049": "pet_shop/tile-B-03 14_sprite_64_96x96|none::1555,1095::solid::behind::layer:0", "freeform:deco_petshop_050": "pet_shop/tile-B-01 15_sprite_37_96x48|none::1665,1095::passable::behind::layer:0", "freeform:deco_petshop_051": "pet_shop/tile-B-01 15_sprite_56_96x48|none::1715,995::passable::behind::layer:0", "freeform:deco_petshop_052": "pet_shop/tile-B-01 15_sprite_50_96x48|none::1525,985::passable::behind::layer:0", "freeform:deco_petshop_053": "pet_shop/tile-B-03 14_sprite_05_96x96|none::1685,1020::passable::behind::layer:0", "freeform:deco_petshop_054": "pet_shop/tile-B-01 15_sprite_33_96x48|none::1605,945::passable::behind::layer:0", "freeform:deco_petshop_055": "pet_shop/tile-B-04 14_sprite_90_96x96|none::1776,1280::solid::behind::layer:0", "freeform:deco_petshop_056": "pet_shop/tile-B-04 14_sprite_76_96x96|none::1475,1265::passable::behind::layer:0", "freeform:deco_petshop_057": "pet_shop/tile-B-01 15_sprite_23_96x48|none::1776,1445::solid::behind::layer:0", "freeform:deco_petshop_058": "living_room_two/sprite-12-5|none::1605,1385::passable::behind::layer:0", "freeform:deco_petshop_059": "pet_shop/tile-B-01 15_sprite_106_48x48|none::1485,1435::passable::behind::layer:0", "freeform:deco_petshop_060": "pet_shop/pet_shop_puppy_golden|none::1560,1368::passable::behind::layer:0", "freeform:deco_petshop_061": "pet_shop/pet_shop_puppy_corgi|none::1690,1435::passable::behind::layer:0", "freeform:deco_petshop_062": "pet_shop/pet_shop_aqua_fresh_1|none::240,152::solid::behind::layer:0::interact:fishing", "freeform:deco_petshop_063": "pet_shop/pet_shop_aqua_fresh_2|none::505,152::solid::behind::layer:0::interact:fishing", "freeform:deco_petshop_064": "pet_shop/pet_shop_aqua_salt_1|none::755,152::solid::behind::layer:0::interact:fishing", "freeform:deco_petshop_065": "pet_shop/pet_shop_terrarium_desert|none::852,312::solid::behind::layer:0", "freeform:deco_petshop_066": "pet_shop/pet_shop_terrarium_rainforest|none::852,504::solid::behind::layer:0", "freeform:deco_petshop_067": "pet_shop/pet_shop_rack_aquatics|none::152,412::solid::behind::layer:0", "freeform:deco_petshop_068": "pet_shop/pet_shop_aqua_salt_vert_1|none::148,595::solid::behind::layer:0::interact:fishing", "freeform:deco_petshop_069": "pet_shop/pet_shop_koi_pond|none::480,432::solid::behind::layer:0", "freeform:deco_petshop_070": "pet_shop/tile-B-01 15_sprite_46_48x48|none::480,535::passable::behind::layer:0::interact:fishing", "freeform:deco_petshop_071": "pet_shop/pet_shop_critter_hamster|none::1052,162::solid::behind::layer:0", "freeform:deco_petshop_072": "pet_shop/pet_shop_critter_guinea|none::1226,162::solid::behind::layer:0", "freeform:deco_petshop_073": "pet_shop/pet_shop_critter_bunny|none::1400,162::solid::behind::layer:0", "freeform:deco_petshop_074": "pet_shop/pet_shop_bird_aviary|none::1248,408::solid::behind::layer:0", "freeform:deco_petshop_075": "pet_shop/pet_shop_parakeet|none::1278,340::passable::ontop::layer:2", "freeform:deco_petshop_076": "office_one/sprite-10-3|none::1170,624::solid::behind::layer:0", "freeform:deco_petshop_077": "office_one/sprite-10-3|none::1278,624::solid::behind::layer:0", "freeform:deco_petshop_078": "pet_shop/tile-B-01 15_sprite_16_48x48|none::1170,616::passable::behind::layer:1", "freeform:deco_petshop_079": "pet_shop/tile-B-05 14_sprite_15_48x48|none::1278,616::passable::behind::layer:1", "freeform:deco_petshop_080": "pet_shop/pet_shop_wash_tub|none::2215,768::solid::behind::layer:0", "freeform:deco_petshop_081": "living_room_two/Copy (1) sprite-7-4|none::2115,776::passable::behind::layer:-1", "freeform:deco_petshop_082": "pet_shop/pet_shop_wash_tub|none::2215,912::solid::behind::layer:0", "freeform:deco_petshop_083": "living_room_two/Copy (1) sprite-7-4|none::2115,920::passable::behind::layer:-1", "freeform:deco_petshop_084": "pet_shop/tile-B-05 14_sprite_07_96x96|none::2232,1056::solid::behind::layer:0", "freeform:deco_petshop_085": "pet_shop/pet_shop_groom_table|none::2016,1248::solid::behind::layer:0::interact:calendar", "freeform:deco_petshop_086": "pet_shop/pet_shop_groom_table|none::2208,1248::solid::behind::layer:0", "freeform:deco_petshop_087": "living_room_two/sprite-8-1-1|none::2015,1455::solid::behind::layer:0", "freeform:deco_petshop_088": "living_room_two/sprite-8-1-3|none::2160,1458::solid::behind::layer:0", "freeform:deco_petshop_089": "pet_shop/tile-B-05 14_sprite_04_96x192|none::2248,1385::solid::behind::layer:0", "freeform:deco_petshop_090": "living_room_two/Copy (1) sprite-1-2|none::2248,1345::passable::behind::layer:1", "freeform:deco_petshop_091": "pet_shop/tile-B-05 14_sprite_08_48x48|none::2232,1425::passable::behind::layer:1", "freeform:deco_petshop_092": "pet_shop/tile-B-05 14_sprite_18_48x48|none::2145,1445::passable::behind::layer:1", "freeform:deco_petshop_093": "office_one/gov-tile-B-01_sprite_18_48x96|none::1665,200::solid::behind::layer:0", "freeform:deco_petshop_094": "office_one/gov-tile-B-01_sprite_18_48x96|none::1665,305::solid::behind::layer:0", "freeform:deco_petshop_095": "office_one/gov-tile-B-02_sprite_58_43x38|none::1805,185::solid::behind::layer:0", "freeform:deco_petshop_096": "living_room_two/Copy (1) sprite-8-8|none::1805,232::solid::behind::layer:0", "freeform:deco_petshop_097": "pet_shop/tile-B-05 14_sprite_53_48x96|none::1805,285::solid::behind::layer:0", "freeform:deco_petshop_098": "living_room_one/Copy (1) sprite-5-5|none::1605,520::solid::behind::layer:0", "freeform:deco_petshop_099": "living_room_two/sprite-10-1|none::1700,526::solid::behind::layer:0", "freeform:deco_petshop_100": "office_one/Copy (1) sprite-10-10|none::1682,514::passable::behind::layer:1", "freeform:deco_petshop_101": "living_room_two/Copy (2) sprite-2-4|none::1722,512::passable::behind::layer:1", "freeform:deco_petshop_102": "office_one/sprite-10-9|none::1700,578::passable::behind::layer:0", "freeform:deco_petshop_103": "office_one/sprite-10-12|none::2258,125::passable::behind::layer:1", "freeform:deco_petshop_104": "living_room_two/sprite-12-15|none::2208,125::passable::behind::layer:0", "freeform:deco_petshop_105": "office_one/gov-tile-B-01_sprite_43_48x96|none::2258,190::solid::behind::layer:0", "freeform:deco_petshop_106": "office_one/sprite-10-14|none::2136,288::solid::behind::layer:0", "freeform:deco_petshop_107": "office_one/sprite-14-4|none::2168,252::passable::behind::layer:1", "freeform:deco_petshop_108": "pet_shop/tile-B-05 14_sprite_12_96x96|none::2232,430::solid::behind::layer:0", "freeform:deco_petshop_109": "pet_shop/tile-B-05 14_sprite_55_96x96|none::2232,532::solid::behind::layer:0"}	[{"id": "pz_petshop_aquatics", "name": "Aquatics & Reptile Gallery", "bounds": {"maxCol": 17, "maxRow": 14, "minCol": 2, "minRow": 2}, "createdAt": 1795141989682}, {"id": "pz_petshop_aviary", "name": "Aviary & Small Critters", "bounds": {"maxCol": 29, "maxRow": 14, "minCol": 19, "minRow": 2}, "createdAt": 1795141989683}, {"id": "pz_petshop_kittens", "name": "Kitten Adoption Lounge", "bounds": {"maxCol": 36, "maxRow": 22, "minCol": 28, "minRow": 16}, "createdAt": 1795141989684}, {"id": "pz_petshop_puppies", "name": "Puppy Adoption Playpen", "bounds": {"maxCol": 36, "maxRow": 29, "minCol": 28, "minRow": 24}, "createdAt": 1795141989685}, {"id": "pz_petshop_grooming", "name": "Grooming Salon & Spa", "bounds": {"maxCol": 45, "maxRow": 29, "minCol": 38, "minRow": 13}, "createdAt": 1795141989686}, {"id": "pz_petshop_boh", "name": "Stockroom & Vet Clinic", "bounds": {"maxCol": 45, "maxRow": 11, "minCol": 31, "minRow": 2}, "createdAt": 1795141989687}]	[]	[]	[]	[]	[]	[]	[]	auto	{"x": 1000, "y": 1381, "id": "seller_space_1794994971056_gtps5", "layer": 0, "enabled": true, "spaceId": "space_1794994971056_gtps5", "shopTheme": "auto", "showCounter": true}
space_central_plaza	Office	Hangout Lounges	8	t	t	[]	2026-10-17 12:04:32.067607+00	2026-11-21 06:39:30.560966+00	{"0,0": "wood_wall_18::obstacle", "0,1": "wood_wall_7::obstacle", "0,2": "wood_wall_7::obstacle", "0,3": "wood_wall_7::obstacle", "0,4": "wood_wall_7::obstacle", "0,5": "wood_wall_7::obstacle", "0,6": "wood_wall_16::obstacle", "0,7": "wood_wall_7::obstacle", "0,8": "wood_wall_7::obstacle", "0,9": "wood_wall_7::obstacle", "1,0": "wood_wall_8::obstacle", "1,1": "wood_wall_3::obstacle", "1,2": "carpet_4", "1,3": "carpet_4", "1,4": "carpet_4", "1,5": "carpet_4", "1,6": "wood_wall_8::obstacle", "1,7": "wood_wall_3::obstacle", "1,8": "wood_4", "1,9": "wood_4", "2,0": "wood_wall_8::obstacle", "2,1": "wood_wall_3::obstacle", "2,2": "carpet_4", "2,3": "carpet_4", "2,4": "carpet_4", "2,5": "carpet_4", "2,6": "wood_wall_9::obstacle", "2,7": "wood_wall_3::obstacle", "2,8": "wood_4", "2,9": "wood_4", "3,0": "wood_wall_8::obstacle", "3,1": "wood_wall_3::obstacle", "3,2": "carpet_4", "3,3": "carpet_4", "3,4": "carpet_4", "3,5": "carpet_4", "3,6": "carpet_4", "3,7": "carpet_4", "3,8": "wood_4", "3,9": "wood_4", "4,0": "wood_wall_8::obstacle", "4,1": "wood_wall_3::obstacle", "4,2": "carpet_4", "4,3": "carpet_4", "4,4": "carpet_4", "4,5": "carpet_4", "4,6": "wood_wall_10::obstacle", "4,7": "wood_wall_3::obstacle", "4,8": "wood_4", "4,9": "wood_4", "5,0": "wood_wall_8::obstacle", "5,1": "wood_wall_3::obstacle", "5,2": "carpet_4", "5,3": "carpet_4", "5,4": "carpet_4", "5,5": "carpet_4", "5,6": "wood_wall_8::obstacle", "5,7": "wood_wall_3::obstacle", "5,8": "wood_4", "5,9": "wood_4", "6,0": "wood_wall_14::obstacle", "6,1": "wood_wall_7::obstacle", "6,2": "wood_wall_7::obstacle", "6,3": "wood_wall_7::obstacle", "6,4": "wood_wall_7::obstacle", "6,5": "wood_wall_7::obstacle", "6,6": "wood_wall_13::obstacle", "6,7": "wood_wall_3::obstacle", "6,8": "wood_4", "6,9": "wood_4", "7,0": "wood_wall_8::obstacle", "7,1": "wood_wall_3::obstacle", "7,2": "carpet_4", "7,3": "carpet_4", "7,4": "carpet_4", "7,5": "carpet_4", "7,6": "wood_wall_8::obstacle", "7,7": "wood_wall_3::obstacle", "7,8": "wood_4", "7,9": "wood_4", "8,0": "wood_wall_8::obstacle", "8,1": "wood_wall_3::obstacle", "8,2": "carpet_4", "8,3": "carpet_4", "8,4": "carpet_4", "8,5": "carpet_4", "8,6": "wood_wall_9::obstacle", "8,7": "wood_wall_3::obstacle", "8,8": "wood_4", "8,9": "wood_4", "9,0": "wood_wall_8::obstacle", "9,1": "wood_wall_3::obstacle", "9,2": "carpet_4", "9,3": "carpet_4", "9,4": "carpet_4", "9,5": "carpet_4", "9,6": "carpet_4", "9,7": "carpet_4", "9,8": "wood_4", "9,9": "wood_4", "0,10": "wood_wall_7::obstacle", "0,11": "wood_wall_7::obstacle", "0,12": "wood_wall_7::obstacle", "0,13": "wood_wall_7::obstacle", "0,14": "wood_wall_7::obstacle", "0,15": "wood_wall_7::obstacle", "0,16": "wood_wall_7::obstacle", "0,17": "wood_wall_7::obstacle", "0,18": "wood_wall_7::obstacle", "0,19": "wood_wall_7::obstacle", "0,20": "wood_wall_7::obstacle", "0,21": "wood_wall_7::obstacle", "0,22": "wood_wall_7::obstacle", "0,23": "wood_wall_7::obstacle", "0,24": "wood_wall_7::obstacle", "0,25": "wood_wall_5::obstacle", "0,26": "wood_wall_3::obstacle", "0,27": "wood_4", "0,28": "wood_wall_18::obstacle", "0,29": "wood_wall_7::obstacle", "0,30": "wood_wall_7::obstacle", "0,31": "wood_wall_7::obstacle", "0,32": "wood_wall_7::obstacle", "0,33": "wood_wall_7::obstacle", "0,34": "wood_wall_11::obstacle", "0,35": "wood_wall_3::obstacle", "1,10": "wood_4", "1,11": "wood_4", "1,12": "wood_4", "1,13": "wood_4", "1,14": "wood_4", "1,15": "wood_4", "1,16": "wood_4", "1,17": "wood_4", "1,18": "wood_4", "1,19": "wood_4", "1,20": "wood_4", "1,21": "wood_4", "1,22": "wood_4", "1,23": "wood_4", "1,24": "wood_4", "1,25": "wood_4", "1,26": "wood_4", "1,27": "wood_4", "1,28": "wood_wall_8::obstacle", "1,29": "wood_wall_3::obstacle", "1,30": "carpet_4@1", "1,31": "carpet_4", "1,32": "carpet_4", "1,33": "carpet_4", "1,34": "wood_wall_8@1::obstacle", "1,35": "wood_wall_3::obstacle", "10,0": "wood_wall_8::obstacle", "10,1": "wood_wall_3::obstacle", "10,2": "carpet_4", "10,3": "carpet_4", "10,4": "carpet_4", "10,5": "carpet_4", "10,6": "wood_wall_10::obstacle", "10,7": "wood_wall_3::obstacle", "10,8": "wood_4", "10,9": "wood_4", "11,0": "wood_wall_8::obstacle", "11,1": "wood_wall_3::obstacle", "11,2": "carpet_4", "11,3": "carpet_4", "11,4": "carpet_4", "11,5": "carpet_4", "11,6": "wood_wall_8::obstacle", "11,7": "wood_wall_3::obstacle", "11,8": "wood_4", "11,9": "wood_4", "12,0": "wood_wall_14::obstacle", "12,1": "wood_wall_7::obstacle", "12,2": "wood_wall_7::obstacle", "12,3": "wood_wall_7::obstacle", "12,4": "wood_wall_7::obstacle", "12,5": "wood_wall_7::obstacle", "12,6": "wood_wall_13::obstacle", "12,7": "wood_wall_3::obstacle", "12,8": "wood_4", "12,9": "wood_4", "13,0": "wood_wall_8::obstacle", "13,1": "wood_wall_3::obstacle", "13,2": "carpet_4", "13,3": "carpet_4", "13,4": "carpet_4", "13,5": "carpet_4", "13,6": "wood_wall_8@7^ontop::obstacle", "13,7": "wood_wall_3::obstacle", "13,8": "wood_4", "13,9": "wood_4", "14,0": "wood_wall_8::obstacle", "14,1": "wood_wall_3::obstacle", "14,2": "carpet_4", "14,3": "carpet_4", "14,4": "carpet_4", "14,5": "carpet_4", "14,6": "wood_wall_9@7^ontop::obstacle", "14,7": "wood_wall_3::obstacle", "14,8": "wood_4", "14,9": "wood_4", "15,0": "wood_wall_8::obstacle", "15,1": "wood_wall_3::obstacle", "15,2": "carpet_4", "15,3": "carpet_4", "15,4": "carpet_4", "15,5": "carpet_4", "15,6": "carpet_4", "15,7": "carpet_4", "15,8": "wood_4", "15,9": "wood_4", "16,0": "wood_wall_8::obstacle", "16,1": "wood_wall_3::obstacle", "16,2": "carpet_4", "16,3": "carpet_4", "16,4": "carpet_4", "16,5": "carpet_4", "16,6": "wood_wall_10@7^ontop::obstacle", "16,7": "wood_wall_3::obstacle", "16,8": "wood_4", "16,9": "wood_4", "17,0": "wood_wall_8::obstacle", "17,1": "wood_wall_3::obstacle", "17,2": "carpet_4", "17,3": "carpet_4", "17,4": "carpet_4", "17,5": "carpet_4", "17,6": "wood_wall_8@7^ontop::obstacle", "17,7": "wood_wall_3::obstacle", "17,8": "wood_4", "17,9": "wood_4", "18,0": "wood_wall_14::obstacle", "18,1": "wood_wall_7::obstacle", "18,2": "wood_wall_7::obstacle", "18,3": "wood_wall_7::obstacle", "18,4": "wood_wall_7::obstacle", "18,5": "wood_wall_7::obstacle", "18,6": "wood_wall_13::obstacle", "18,7": "wood_wall_3::obstacle", "18,8": "wood_4", "18,9": "wood_wall_18::obstacle", "19,0": "wood_wall_8::obstacle", "19,1": "wood_wall_3::obstacle", "19,2": "carpet_4", "19,3": "carpet_4", "19,4": "carpet_4", "19,5": "carpet_4", "19,6": "wood_wall_8::obstacle", "19,7": "wood_wall_3::obstacle", "19,8": "wood_4", "19,9": "wood_wall_8::obstacle", "2,10": "wood_4", "2,11": "wood_4", "2,12": "wood_4", "2,13": "wood_4", "2,14": "wood_4", "2,15": "wood_4", "2,16": "wood_4", "2,17": "wood_4", "2,18": "wood_4", "2,19": "wood_4", "2,20": "wood_4", "2,21": "wood_4", "2,22": "wood_4", "2,23": "wood_4", "2,24": "wood_4", "2,25": "wood_4", "2,26": "wood_4", "2,27": "wood_4", "2,28": "wood_wall_9::obstacle", "2,29": "wood_wall_3::obstacle", "2,30": "carpet_4@1", "2,31": "carpet_4", "2,32": "carpet_4", "2,33": "carpet_4", "2,34": "wood_wall_8@1::obstacle", "2,35": "wood_wall_3::obstacle", "20,0": "wood_wall_8::obstacle", "20,1": "wood_wall_3::obstacle", "20,2": "carpet_4", "20,3": "carpet_4", "20,4": "carpet_4", "20,5": "carpet_4", "20,6": "wood_wall_9::obstacle", "20,7": "wood_wall_3::obstacle", "20,8": "wood_4", "20,9": "wood_wall_9::obstacle", "21,0": "wood_wall_8::obstacle", "21,1": "wood_wall_3::obstacle", "21,2": "carpet_4", "21,3": "carpet_4", "21,4": "carpet_4", "21,5": "carpet_4", "21,6": "carpet_4", "21,7": "carpet_4", "21,8": "wood_4", "21,9": "wood_4", "22,0": "wood_wall_8::obstacle", "22,1": "wood_wall_3::obstacle", "22,2": "carpet_4", "22,3": "carpet_4", "22,4": "carpet_4", "22,5": "carpet_4", "22,6": "wood_wall_10::obstacle", "22,7": "wood_wall_3::obstacle", "22,8": "wood_4", "22,9": "wood_wall_10::obstacle", "23,0": "wood_wall_8::obstacle", "23,1": "wood_wall_3::obstacle", "23,2": "carpet_4", "23,3": "carpet_4", "23,4": "carpet_4", "23,5": "carpet_4", "23,6": "wood_wall_8::obstacle", "23,7": "wood_wall_3::obstacle", "23,8": "wood_4", "23,9": "wood_wall_8::obstacle", "24,0": "wood_wall_14::obstacle", "24,1": "wood_wall_7::obstacle", "24,2": "wood_wall_7::obstacle", "24,3": "wood_wall_7::obstacle", "24,4": "wood_wall_7::obstacle", "24,5": "wood_wall_7::obstacle", "24,6": "wood_wall_13::obstacle", "24,7": "wood_wall_3::obstacle", "24,8": "wood_4", "24,9": "wood_wall_14::obstacle", "25,0": "wood_wall_8::obstacle", "25,1": "wood_wall_3::obstacle", "25,2": "carpet_4", "25,3": "carpet_4", "25,4": "carpet_4", "25,5": "carpet_4", "25,6": "wood_wall_8::obstacle", "25,7": "wood_wall_3::obstacle", "25,8": "wood_4", "25,9": "wood_wall_8::obstacle", "26,0": "wood_wall_8::obstacle", "26,1": "wood_wall_3::obstacle", "26,2": "carpet_4", "26,3": "carpet_4", "26,4": "carpet_4", "26,5": "carpet_4", "26,6": "wood_wall_9::obstacle", "26,7": "wood_wall_3::obstacle", "26,8": "wood_4", "26,9": "wood_wall_9::obstacle", "27,0": "wood_wall_8::obstacle", "27,1": "wood_wall_3::obstacle", "27,2": "carpet_4", "27,3": "carpet_4", "27,4": "carpet_4", "27,5": "carpet_4", "27,6": "carpet_4", "27,7": "carpet_4", "27,8": "wood_4", "27,9": "wood_4", "28,0": "wood_wall_8::obstacle", "28,1": "wood_wall_3::obstacle", "28,2": "carpet_4", "28,3": "carpet_4", "28,4": "carpet_4", "28,5": "carpet_4", "28,6": "wood_wall_10::obstacle", "28,7": "wood_wall_3::obstacle", "28,8": "wood_4", "28,9": "wood_wall_8::obstacle", "29,0": "wood_wall_8::obstacle", "29,1": "wood_wall_3::obstacle", "29,2": "carpet_4", "29,3": "carpet_4", "29,4": "carpet_4", "29,5": "carpet_4", "29,6": "wood_wall_8::obstacle", "29,7": "wood_wall_3::obstacle", "29,8": "wood_4", "29,9": "wood_wall_8::obstacle", "3,10": "wood_4", "3,11": "wood_4", "3,12": "wood_4", "3,13": "wood_4", "3,14": "wood_4", "3,15": "wood_4", "3,16": "wood_4", "3,17": "wood_4", "3,18": "wood_4", "3,19": "wood_4", "3,20": "wood_4", "3,21": "wood_4", "3,22": "wood_4", "3,23": "wood_4", "3,24": "wood_4", "3,25": "wood_4", "3,26": "wood_4", "3,27": "wood_4", "3,28": "wood_4", "3,29": "carpet_4", "3,30": "carpet_4", "3,31": "carpet_4", "3,32": "carpet_4", "3,33": "carpet_4", "3,34": "wood_wall_8::obstacle", "3,35": "wood_wall_3::obstacle", "30,0": "wood_wall_14::obstacle", "30,1": "wood_wall_7::obstacle", "30,2": "wood_wall_7::obstacle", "30,3": "wood_wall_7::obstacle", "30,4": "wood_wall_7::obstacle", "30,5": "wood_wall_7::obstacle", "30,6": "wood_wall_19::obstacle", "30,7": "wood_wall_3::obstacle", "30,8": "wood_4", "30,9": "wood_wall_14::obstacle", "31,0": "wood_wall_8::obstacle", "31,1": "wood_wall_3::obstacle", "31,2": "wood_4", "31,3": "wood_4", "31,4": "wood_4", "31,5": "wood_4", "31,6": "wood_4", "31,7": "wood_4", "31,8": "wood_4", "31,9": "wood_wall_8::obstacle", "32,0": "wood_wall_8::obstacle", "32,1": "wood_wall_3::obstacle", "32,2": "wood_4", "32,3": "wood_4", "32,4": "wood_4", "32,5": "wood_4", "32,6": "wood_4", "32,7": "wood_4", "32,8": "wood_4", "32,9": "wood_wall_9::obstacle", "33,0": "wood_wall_8::obstacle", "33,1": "wood_wall_3::obstacle", "33,2": "wood_4", "33,3": "wood_4", "33,4": "wood_4", "33,5": "wood_4", "33,6": "wood_4", "33,7": "wood_4", "33,8": "wood_4", "33,9": "wood_4", "34,0": "wood_wall_8::obstacle", "34,1": "wood_wall_3::obstacle", "34,2": "wood_4", "34,3": "wood_4", "34,4": "wood_4", "34,5": "wood_4", "34,6": "wood_4", "34,7": "wood_4", "34,8": "wood_4", "34,9": "wood_wall_10::obstacle", "35,0": "wood_wall_8::obstacle", "35,1": "wood_wall_3::obstacle", "35,2": "wood_4", "35,3": "wood_4", "35,4": "wood_4", "35,5": "wood_4", "35,6": "wood_4", "35,7": "wood_4", "35,8": "wood_4", "35,9": "wood_wall_8::obstacle", "36,0": "wood_wall_8::obstacle", "36,1": "wood_wall_3::obstacle", "36,2": "wood_4", "36,3": "wood_4", "36,4": "wood_4", "36,5": "wood_4", "36,6": "wood_4", "36,7": "wood_4", "36,8": "wood_4", "36,9": "wood_wall_17::obstacle", "37,0": "wood_wall_8::obstacle", "37,1": "wood_wall_3::obstacle", "37,2": "wood_4", "37,3": "wood_4", "37,4": "wood_4", "37,5": "wood_4", "37,6": "wood_4", "37,7": "wood_4", "37,8": "wood_4", "37,9": "wood_4", "38,0": "wood_wall_8::obstacle", "38,1": "wood_wall_3::obstacle", "38,2": "wood_4", "38,3": "wood_4", "38,4": "wood_4", "38,5": "wood_4", "38,6": "wood_4", "38,7": "wood_4", "38,8": "wood_4", "38,9": "wood_4", "39,0": "wood_wall_8::obstacle", "39,1": "wood_wall_3::obstacle", "39,2": "wood_4", "39,3": "wood_4", "39,4": "wood_4", "39,5": "wood_4", "39,6": "wood_4", "39,7": "wood_4", "39,8": "wood_4", "39,9": "wood_4", "4,10": "wood_4", "4,11": "wood_4", "4,12": "wood_4", "4,13": "wood_4", "4,14": "wood_4", "4,15": "wood_4", "4,16": "wood_4", "4,17": "wood_4", "4,18": "wood_4", "4,19": "wood_4", "4,20": "wood_4", "4,21": "wood_4", "4,22": "wood_4", "4,23": "wood_4", "4,24": "wood_4", "4,25": "wood_4", "4,26": "wood_4", "4,27": "wood_4", "4,28": "wood_wall_10::obstacle", "4,29": "wood_wall_3::obstacle", "4,30": "carpet_4", "4,31": "carpet_4", "4,32": "carpet_4", "4,33": "carpet_4", "4,34": "wood_wall_8@1::obstacle", "4,35": "wood_wall_3::obstacle", "40,0": "wood_wall_8::obstacle", "40,1": "wood_wall_3::obstacle", "40,2": "wood_4", "40,3": "wood_4", "40,4": "wood_4", "40,5": "wood_4", "40,6": "wood_4", "40,7": "wood_4", "40,8": "wood_4", "40,9": "wood_4", "41,0": "wood_wall_8::obstacle", "41,1": "wood_wall_3::obstacle", "41,2": "wood_4", "41,3": "wood_4", "41,4": "wood_4", "41,5": "wood_4", "41,6": "wood_4", "41,7": "wood_4", "41,8": "wood_4", "41,9": "wood_4", "42,0": "wood_wall_8::obstacle", "42,1": "wood_wall_3::obstacle", "42,2": "wood_4", "42,3": "wood_4", "42,4": "wood_4", "42,5": "wood_4", "42,6": "wood_4", "42,7": "wood_4", "42,8": "wood_4", "42,9": "wood_4", "43,0": "wood_wall_17::obstacle", "43,1": "wood_wall_7::obstacle", "43,2": "wood_wall_7::obstacle", "43,3": "wood_wall_7::obstacle", "43,4": "wood_wall_7::obstacle", "43,5": "wood_wall_7::obstacle", "43,6": "wood_wall_7::obstacle", "43,7": "wood_wall_7::obstacle", "43,8": "wood_wall_7::obstacle", "43,9": "wood_wall_11::obstacle", "44,0": "grass_4", "44,1": "grass_4", "44,2": "grass_4", "44,3": "grass_4", "44,4": "grass_4", "44,5": "grass_4", "44,6": "grass_4", "44,7": "grass_4", "44,8": "grass_4", "44,9": "wood_wall_8::obstacle", "45,0": "grass_4", "45,1": "grass_4", "45,2": "grass_4", "45,3": "grass_4", "45,4": "grass_4", "45,5": "grass_4", "45,6": "grass_4", "45,7": "grass_4", "45,8": "grass_4", "45,9": "wood_wall_9::obstacle", "46,0": "grass_4", "46,1": "grass_4", "46,2": "grass_4", "46,3": "grass_4", "46,4": "grass_4", "46,5": "grass_4", "46,6": "grass_4", "46,7": "grass_4", "46,8": "grass_4", "46,9": "grass_4", "47,0": "grass_4", "47,1": "grass_4", "47,2": "grass_4", "47,3": "grass_4", "47,4": "grass_4", "47,5": "grass_4", "47,6": "grass_4", "47,7": "grass_4", "47,8": "grass_4", "47,9": "grass_4", "5,10": "wood_4", "5,11": "wood_4", "5,12": "wood_4", "5,13": "wood_4", "5,14": "wood_4", "5,15": "wood_4", "5,16": "wood_4", "5,17": "wood_4", "5,18": "wood_4", "5,19": "wood_4", "5,20": "wood_4", "5,21": "wood_4", "5,22": "wood_4", "5,23": "wood_4", "5,24": "wood_4", "5,25": "wood_4", "5,26": "wood_4", "5,27": "wood_4", "5,28": "wood_wall_8::obstacle", "5,29": "wood_wall_3::obstacle", "5,30": "carpet_4", "5,31": "carpet_4", "5,32": "carpet_4", "5,33": "carpet_4", "5,34": "wood_wall_8@1::obstacle", "5,35": "wood_wall_3::obstacle", "6,10": "wood_4", "6,11": "wood_4", "6,12": "wood_4", "6,13": "wood_4", "6,14": "wood_4", "6,15": "wood_4", "6,16": "wood_4", "6,17": "wood_4", "6,18": "wood_4", "6,19": "wood_4", "6,20": "wood_4", "6,21": "wood_4", "6,22": "wood_4", "6,23": "wood_4", "6,24": "wood_4", "6,25": "wood_4", "6,26": "wood_4", "6,27": "wood_4", "6,28": "wood_wall_14::obstacle", "6,29": "wood_wall_7::obstacle", "6,30": "wood_wall_7::obstacle", "6,31": "wood_wall_7::obstacle", "6,32": "wood_wall_7::obstacle", "6,33": "wood_wall_7::obstacle", "6,34": "wood_wall_13::obstacle", "6,35": "wood_wall_3::obstacle", "7,10": "wood_4", "7,11": "wood_4", "7,12": "wood_4", "7,13": "wood_4", "7,14": "wood_4", "7,15": "wood_4", "7,16": "wood_4", "7,17": "wood_4", "7,18": "wood_4", "7,19": "wood_4", "7,20": "wood_4", "7,21": "wood_4", "7,22": "wood_4", "7,23": "wood_4", "7,24": "wood_4", "7,25": "wood_4", "7,26": "wood_4", "7,27": "wood_4", "7,28": "wood_wall_8::obstacle", "7,29": "wood_wall_3::obstacle", "7,30": "carpet_4", "7,31": "carpet_4", "7,32": "carpet_4", "7,33": "carpet_4", "7,34": "wood_wall_8@1::obstacle", "7,35": "wood_wall_3::obstacle", "8,10": "wood_4", "8,11": "wood_4", "8,12": "wood_4", "8,13": "wood_4", "8,14": "wood_4", "8,15": "wood_4", "8,16": "wood_4", "8,17": "wood_4", "8,18": "wood_4", "8,19": "wood_4", "8,20": "wood_4", "8,21": "wood_4", "8,22": "wood_4", "8,23": "wood_4", "8,24": "wood_4", "8,25": "wood_4", "8,26": "wood_4", "8,27": "wood_4", "8,28": "wood_wall_9::obstacle", "8,29": "wood_wall_3::obstacle", "8,30": "carpet_4", "8,31": "carpet_4", "8,32": "carpet_4", "8,33": "carpet_4", "8,34": "wood_wall_8::obstacle", "8,35": "wood_wall_3::obstacle", "9,10": "wood_4", "9,11": "wood_4", "9,12": "wood_4", "9,13": "wood_4", "9,14": "wood_4", "9,15": "wood_4", "9,16": "wood_4", "9,17": "wood_4", "9,18": "wood_4", "9,19": "wood_4", "9,20": "wood_4", "9,21": "wood_4", "9,22": "wood_4", "9,23": "wood_4", "9,24": "wood_4", "9,25": "wood_4", "9,26": "wood_4", "9,27": "wood_4", "9,28": "wood_4", "9,29": "carpet_4", "9,30": "carpet_4", "9,31": "carpet_4", "9,32": "carpet_4", "9,33": "carpet_4", "9,34": "wood_wall_8::obstacle", "9,35": "wood_wall_3::obstacle", "10,10": "wood_4", "10,11": "wood_4", "10,12": "wood_4", "10,13": "wood_4", "10,14": "wood_4", "10,15": "wood_4", "10,16": "wood_4", "10,17": "wood_4", "10,18": "wood_4", "10,19": "wood_4", "10,20": "wood_4", "10,21": "wood_4", "10,22": "wood_4", "10,23": "wood_4", "10,24": "wood_4", "10,25": "wood_4", "10,26": "wood_4", "10,27": "wood_4", "10,28": "wood_wall_10::obstacle", "10,29": "wood_wall_3::obstacle", "10,30": "carpet_4", "10,31": "carpet_4", "10,32": "carpet_4", "10,33": "carpet_4", "10,34": "wood_wall_8::obstacle", "10,35": "wood_wall_3::obstacle", "11,10": "wood_4", "11,11": "wood_4", "11,12": "wood_4", "11,13": "wood_4", "11,14": "wood_4", "11,15": "wood_4", "11,16": "wood_4", "11,17": "wood_4", "11,18": "wood_4", "11,19": "wood_4", "11,20": "wood_4", "11,21": "wood_4", "11,22": "wood_4", "11,23": "wood_4", "11,24": "wood_4", "11,25": "wood_4", "11,26": "wood_4", "11,27": "wood_4", "11,28": "wood_wall_8::obstacle", "11,29": "wood_wall_3::obstacle", "11,30": "carpet_4", "11,31": "carpet_4", "11,32": "carpet_4", "11,33": "carpet_4", "11,34": "wood_wall_8::obstacle", "11,35": "wood_wall_3::obstacle", "12,10": "wood_4", "12,11": "wood_4", "12,12": "wood_4", "12,13": "wood_4@0~flipx", "12,14": "wood_4", "12,15": "wood_4", "12,16": "wood_4", "12,17": "wood_4", "12,18": "wood_4", "12,19": "wood_4", "12,20": "wood_4", "12,21": "wood_4", "12,22": "wood_4", "12,23": "wood_4", "12,24": "wood_4", "12,25": "wood_4", "12,26": "wood_4", "12,27": "wood_4", "12,28": "wood_wall_14::obstacle", "12,29": "wood_wall_7::obstacle", "12,30": "wood_wall_7::obstacle", "12,31": "wood_wall_7::obstacle", "12,32": "wood_wall_7::obstacle", "12,33": "wood_wall_7::obstacle", "12,34": "wood_wall_13::obstacle", "12,35": "wood_wall_3::obstacle", "13,10": "wood_4", "13,11": "wood_4", "13,12": "wood_4", "13,13": "wood_4", "13,14": "wood_4", "13,15": "wood_4", "13,16": "wood_4", "13,17": "wood_4", "13,18": "wood_4", "13,19": "wood_4", "13,20": "wood_4", "13,21": "wood_4", "13,22": "wood_4", "13,23": "wood_4", "13,24": "wood_4", "13,25": "wood_4", "13,26": "wood_4", "13,27": "wood_4", "13,28": "wood_wall_8::obstacle", "13,29": "wood_wall_3::obstacle", "13,30": "carpet_4", "13,31": "carpet_4", "13,32": "carpet_4", "13,33": "carpet_4", "13,34": "wood_wall_8::obstacle", "13,35": "wood_wall_3::obstacle", "14,10": "wood_4", "14,11": "wood_4", "14,12": "wood_4", "14,13": "wood_4", "14,14": "wood_4", "14,15": "wood_4", "14,16": "wood_4", "14,17": "wood_4", "14,18": "wood_4", "14,19": "wood_4", "14,20": "wood_4", "14,21": "wood_4", "14,22": "wood_4", "14,23": "wood_4", "14,24": "wood_4", "14,25": "wood_4", "14,26": "wood_4", "14,27": "wood_4", "14,28": "wood_wall_9::obstacle", "14,29": "wood_wall_3::obstacle", "14,30": "carpet_4", "14,31": "carpet_4", "14,32": "carpet_4", "14,33": "carpet_4", "14,34": "wood_wall_8::obstacle", "14,35": "wood_wall_3::obstacle", "15,10": "wood_4", "15,11": "wood_4", "15,12": "wood_4", "15,13": "wood_4", "15,14": "wood_4", "15,15": "wood_4", "15,16": "wood_4", "15,17": "wood_4", "15,18": "wood_4", "15,19": "wood_4", "15,20": "wood_4", "15,21": "wood_4", "15,22": "wood_4", "15,23": "wood_4", "15,24": "wood_4", "15,25": "wood_4", "15,26": "wood_4", "15,27": "wood_4", "15,28": "wood_4", "15,29": "carpet_4", "15,30": "carpet_4", "15,31": "carpet_4", "15,32": "carpet_4", "15,33": "carpet_4", "15,34": "wood_wall_8::obstacle", "15,35": "wood_wall_3::obstacle", "16,10": "wood_4", "16,11": "wood_4", "16,12": "wood_4", "16,13": "wood_4", "16,14": "wood_4", "16,15": "wood_4", "16,16": "wood_4", "16,17": "wood_4", "16,18": "wood_4", "16,19": "wood_4", "16,20": "wood_4", "16,21": "wood_4", "16,22": "wood_4", "16,23": "wood_4", "16,24": "wood_4", "16,25": "wood_4", "16,26": "wood_4", "16,27": "wood_4", "16,28": "wood_wall_10::obstacle", "16,29": "wood_wall_3::obstacle", "16,30": "carpet_4", "16,31": "carpet_4", "16,32": "carpet_4", "16,33": "carpet_4", "16,34": "wood_wall_8::obstacle", "16,35": "wood_wall_3::obstacle", "17,10": "wood_4", "17,11": "wood_4", "17,12": "wood_4", "17,13": "wood_4", "17,14": "wood_4", "17,15": "wood_4", "17,16": "wood_4", "17,17": "wood_4", "17,18": "wood_4", "17,19": "wood_4", "17,20": "wood_4", "17,21": "wood_4", "17,22": "wood_4", "17,23": "wood_4", "17,24": "wood_4", "17,25": "wood_4", "17,26": "wood_4", "17,27": "wood_4", "17,28": "wood_wall_8::obstacle", "17,29": "wood_wall_3::obstacle", "17,30": "carpet_4", "17,31": "carpet_4", "17,32": "carpet_4", "17,33": "carpet_4", "17,34": "wood_wall_8::obstacle", "17,35": "wood_wall_3::obstacle", "18,10": "wood_wall_7::obstacle", "18,11": "wood_wall_7::obstacle", "18,12": "wood_wall_7::obstacle", "18,13": "wood_wall_7::obstacle", "18,14": "wood_wall_7::obstacle", "18,15": "wood_wall_7::obstacle", "18,16": "wood_wall_7::obstacle", "18,17": "wood_wall_7::obstacle", "18,18": "wood_wall_7::obstacle", "18,19": "wood_wall_16::obstacle", "18,20": "wood_wall_7::obstacle", "18,21": "wood_wall_7::obstacle", "18,22": "wood_wall_7::obstacle", "18,23": "wood_wall_7::obstacle", "18,24": "wood_wall_7::obstacle", "18,25": "wood_wall_5::obstacle", "18,26": "wood_wall_3::obstacle", "18,27": "wood_4", "18,28": "wood_wall_14::obstacle", "18,29": "wood_wall_7::obstacle", "18,30": "wood_wall_7::obstacle", "18,31": "wood_wall_7::obstacle", "18,32": "wood_wall_7::obstacle", "18,33": "wood_wall_7::obstacle", "18,34": "wood_wall_13::obstacle", "18,35": "wood_wall_3::obstacle", "19,10": "wood_wall_3::obstacle", "19,11": "carpet_4", "19,12": "carpet_4", "19,13": "carpet_4", "19,14": "carpet_4", "19,15": "carpet_4", "19,16": "carpet_4", "19,17": "carpet_4", "19,18": "carpet_4", "19,19": "wood_wall_8@6::obstacle", "19,20": "wood_wall_3::obstacle", "19,21": "wood_4", "19,22": "wood_4", "19,23": "wood_4", "19,24": "wood_4", "19,25": "wood_4", "19,26": "wood_4", "19,27": "wood_4", "19,28": "wood_wall_8::obstacle", "19,29": "wood_wall_3::obstacle", "19,30": "carpet_4", "19,31": "carpet_4", "19,32": "carpet_4", "19,33": "carpet_4", "19,34": "wood_wall_8::obstacle", "19,35": "wood_wall_3::obstacle", "20,10": "wood_wall_3::obstacle", "20,11": "carpet_4", "20,12": "carpet_4", "20,13": "carpet_4", "20,14": "carpet_4", "20,15": "carpet_4", "20,16": "carpet_4", "20,17": "carpet_4", "20,18": "carpet_4", "20,19": "wood_wall_9::obstacle", "20,20": "wood_wall_3::obstacle", "20,21": "wood_4", "20,22": "wood_4", "20,23": "wood_4", "20,24": "wood_4", "20,25": "wood_4", "20,26": "wood_4", "20,27": "wood_4", "20,28": "wood_wall_9::obstacle", "20,29": "wood_wall_3::obstacle", "20,30": "carpet_4", "20,31": "carpet_4", "20,32": "carpet_4", "20,33": "carpet_4", "20,34": "wood_wall_8::obstacle", "20,35": "wood_wall_3::obstacle", "21,10": "carpet_4", "21,11": "carpet_4", "21,12": "carpet_4", "21,13": "carpet_4", "21,14": "carpet_4", "21,15": "carpet_4", "21,16": "carpet_4", "21,17": "carpet_4", "21,18": "carpet_4", "21,19": "carpet_4", "21,20": "carpet_4", "21,21": "wood_4", "21,22": "wood_4", "21,23": "wood_4", "21,24": "wood_4", "21,25": "wood_4", "21,26": "wood_4", "21,27": "wood_4", "21,28": "wood_4", "21,29": "carpet_4", "21,30": "carpet_4", "21,31": "carpet_4", "21,32": "carpet_4", "21,33": "carpet_4", "21,34": "wood_wall_8::obstacle", "21,35": "wood_wall_3::obstacle", "22,10": "wood_wall_3::obstacle", "22,11": "carpet_4", "22,12": "carpet_4", "22,13": "carpet_4", "22,14": "carpet_4", "22,15": "carpet_4", "22,16": "carpet_4", "22,17": "carpet_4", "22,18": "carpet_4", "22,19": "wood_wall_10::obstacle", "22,20": "wood_wall_3::obstacle", "22,21": "wood_4", "22,22": "wood_4", "22,23": "wood_4", "22,24": "wood_4", "22,25": "wood_4", "22,26": "wood_4", "22,27": "wood_4", "22,28": "wood_wall_10::obstacle", "22,29": "wood_wall_3::obstacle", "22,30": "carpet_4", "22,31": "carpet_4", "22,32": "carpet_4", "22,33": "carpet_4", "22,34": "wood_wall_8::obstacle", "22,35": "wood_wall_3::obstacle", "23,10": "wood_wall_3::obstacle", "23,11": "carpet_4", "23,12": "carpet_4", "23,13": "carpet_4", "23,14": "carpet_4", "23,15": "carpet_4", "23,16": "carpet_4", "23,17": "carpet_4", "23,18": "carpet_4", "23,19": "wood_wall_8@7::obstacle", "23,20": "wood_wall_3::obstacle", "23,21": "wood_4", "23,22": "wood_4", "23,23": "wood_4", "23,24": "wood_4", "23,25": "wood_4", "23,26": "wood_4", "23,27": "wood_4", "23,28": "wood_wall_8::obstacle", "23,29": "wood_wall_3::obstacle", "23,30": "carpet_4", "23,31": "carpet_4", "23,32": "carpet_4", "23,33": "carpet_4", "23,34": "wood_wall_8::obstacle", "23,35": "wood_wall_3::obstacle", "24,10": "wood_wall_7::obstacle", "24,11": "wood_wall_7::obstacle", "24,12": "wood_wall_7::obstacle", "24,13": "wood_wall_7::obstacle", "24,14": "wood_wall_7::obstacle", "24,15": "wood_wall_7::obstacle", "24,16": "wood_wall_7::obstacle", "24,17": "wood_wall_7::obstacle", "24,18": "wood_wall_7::obstacle", "24,19": "wood_wall_13::obstacle", "24,20": "wood_wall_3::obstacle", "24,21": "wood_4", "24,22": "wood_4", "24,23": "wood_4", "24,24": "wood_4", "24,25": "wood_4", "24,26": "wood_4", "24,27": "wood_4", "24,28": "wood_wall_14::obstacle", "24,29": "wood_wall_7::obstacle", "24,30": "wood_wall_7::obstacle", "24,31": "wood_wall_7::obstacle", "24,32": "wood_wall_7::obstacle", "24,33": "wood_wall_7::obstacle", "24,34": "wood_wall_13::obstacle", "24,35": "wood_wall_3::obstacle", "25,10": "wood_wall_3::obstacle", "25,11": "carpet_4", "25,12": "carpet_4", "25,13": "carpet_4", "25,14": "carpet_4", "25,15": "carpet_4", "25,16": "carpet_4", "25,17": "carpet_4", "25,18": "carpet_4", "25,19": "wood_wall_8@2^ontop::obstacle", "25,20": "wood_wall_3::obstacle", "25,21": "wood_4", "25,22": "wood_4", "25,23": "wood_4", "25,24": "wood_4", "25,25": "wood_4", "25,26": "wood_4", "25,27": "wood_4", "25,28": "wood_wall_8::obstacle", "25,29": "wood_wall_3::obstacle", "25,30": "carpet_4", "25,31": "carpet_4", "25,32": "carpet_4", "25,33": "carpet_4", "25,34": "wood_wall_8@4^ontop::obstacle", "25,35": "wood_wall_3::obstacle", "26,10": "wood_wall_3::obstacle", "26,11": "carpet_4", "26,12": "carpet_4", "26,13": "carpet_4", "26,14": "carpet_4", "26,15": "carpet_4", "26,16": "carpet_4", "26,17": "carpet_4", "26,18": "carpet_4", "26,19": "wood_wall_9@2^ontop::obstacle", "26,20": "wood_wall_3::obstacle", "26,21": "wood_4", "26,22": "wood_4", "26,23": "wood_4", "26,24": "wood_4", "26,25": "wood_4", "26,26": "wood_4", "26,27": "wood_4", "26,28": "wood_wall_9::obstacle", "26,29": "wood_wall_3::obstacle", "26,30": "carpet_4", "26,31": "carpet_4", "26,32": "carpet_4", "26,33": "carpet_4", "26,34": "wood_wall_8@3^ontop::obstacle", "26,35": "wood_wall_3::obstacle", "27,10": "carpet_4", "27,11": "carpet_4", "27,12": "carpet_4", "27,13": "carpet_4", "27,14": "carpet_4", "27,15": "carpet_4", "27,16": "carpet_4", "27,17": "carpet_4", "27,18": "carpet_4", "27,19": "carpet_4", "27,20": "carpet_4", "27,21": "wood_4", "27,22": "wood_4", "27,23": "wood_4", "27,24": "wood_4", "27,25": "wood_4", "27,26": "wood_4", "27,27": "wood_4", "27,28": "wood_4", "27,29": "carpet_4", "27,30": "carpet_4", "27,31": "carpet_4", "27,32": "carpet_4", "27,33": "carpet_4", "27,34": "wood_wall_8::obstacle", "27,35": "wood_wall_3::obstacle", "28,10": "wood_wall_3::obstacle", "28,11": "carpet_4", "28,12": "carpet_4", "28,13": "carpet_4", "28,14": "carpet_4", "28,15": "carpet_4", "28,16": "carpet_4", "28,17": "carpet_4", "28,18": "carpet_4", "28,19": "wood_wall_10@2^ontop::obstacle", "28,20": "wood_wall_3::obstacle", "28,21": "wood_4", "28,22": "wood_4", "28,23": "wood_4", "28,24": "wood_4", "28,25": "wood_4", "28,26": "wood_4", "28,27": "wood_4", "28,28": "wood_wall_10::obstacle", "28,29": "wood_wall_3::obstacle", "28,30": "carpet_4", "28,31": "carpet_4", "28,32": "carpet_4", "28,33": "carpet_4", "28,34": "wood_wall_8@3^ontop::obstacle", "28,35": "wood_wall_3::obstacle", "29,10": "wood_wall_3::obstacle", "29,11": "carpet_4", "29,12": "carpet_4", "29,13": "carpet_4", "29,14": "carpet_4", "29,15": "carpet_4", "29,16": "carpet_4", "29,17": "carpet_4", "29,18": "carpet_4", "29,19": "wood_wall_8@2^ontop::obstacle", "29,20": "wood_wall_3::obstacle", "29,21": "wood_4", "29,22": "wood_4", "29,23": "wood_4", "29,24": "wood_4", "29,25": "wood_4", "29,26": "wood_4", "29,27": "wood_4", "29,28": "wood_wall_8::obstacle", "29,29": "wood_wall_3::obstacle", "29,30": "carpet_4", "29,31": "carpet_4", "29,32": "carpet_4", "29,33": "carpet_4", "29,34": "wood_wall_8@3^ontop::obstacle", "29,35": "wood_wall_3::obstacle", "30,10": "wood_wall_7::obstacle", "30,11": "wood_wall_7::obstacle", "30,12": "wood_wall_7::obstacle", "30,13": "wood_wall_7::obstacle", "30,14": "wood_wall_7::obstacle", "30,15": "wood_wall_7::obstacle", "30,16": "wood_wall_7::obstacle", "30,17": "wood_wall_7::obstacle", "30,18": "wood_wall_7::obstacle", "30,19": "wood_wall_13::obstacle", "30,20": "wood_wall_3::obstacle", "30,21": "wood_4", "30,22": "wood_4", "30,23": "wood_4", "30,24": "wood_4", "30,25": "wood_4", "30,26": "wood_4", "30,27": "wood_4", "30,28": "wood_wall_17::obstacle", "30,29": "wood_wall_7::obstacle", "30,30": "wood_wall_7::obstacle", "30,31": "wood_wall_7::obstacle", "30,32": "wood_wall_7::obstacle", "30,33": "wood_wall_7::obstacle", "30,34": "wood_wall_13::obstacle", "30,35": "wood_wall_3::obstacle", "31,10": "wood_wall_3::obstacle", "31,11": "carpet_4", "31,12": "carpet_4", "31,13": "carpet_4", "31,14": "carpet_4", "31,15": "carpet_4", "31,16": "carpet_4", "31,17": "carpet_4", "31,18": "carpet_4", "31,19": "wood_wall_8::obstacle", "31,20": "wood_wall_3::obstacle", "31,21": "wood_4", "31,22": "wood_4", "31,23": "wood_4", "31,24": "wood_4", "31,25": "wood_4", "31,26": "wood_4", "31,27": "wood_4", "31,28": "wood_4", "31,29": "wood_4", "31,30": "wood_4", "31,31": "wood_4", "31,32": "wood_4", "31,33": "wood_4", "31,34": "wood_wall_8::obstacle", "31,35": "wood_wall_3::obstacle", "32,10": "wood_wall_3::obstacle", "32,11": "carpet_4", "32,12": "carpet_4", "32,13": "carpet_4", "32,14": "carpet_4", "32,15": "carpet_4", "32,16": "carpet_4", "32,17": "carpet_4", "32,18": "carpet_4", "32,19": "wood_wall_9::obstacle", "32,20": "wood_wall_3::obstacle", "32,21": "wood_4", "32,22": "wood_4", "32,23": "wood_4", "32,24": "wood_4", "32,25": "wood_4", "32,26": "wood_4", "32,27": "wood_4", "32,28": "wood_4", "32,29": "wood_4", "32,30": "wood_4", "32,31": "wood_4", "32,32": "wood_4", "32,33": "wood_4", "32,34": "wood_wall_8::obstacle", "32,35": "wood_wall_3::obstacle", "33,10": "carpet_4", "33,11": "carpet_4", "33,12": "carpet_4", "33,13": "carpet_4", "33,14": "carpet_4", "33,15": "carpet_4", "33,16": "carpet_4", "33,17": "carpet_4", "33,18": "carpet_4", "33,19": "carpet_4", "33,20": "carpet_4", "33,21": "wood_4", "33,22": "wood_4", "33,23": "wood_4", "33,24": "wood_4", "33,25": "wood_4", "33,26": "wood_4", "33,27": "wood_4", "33,28": "wood_4", "33,29": "wood_4", "33,30": "wood_4", "33,31": "wood_4", "33,32": "wood_4", "33,33": "wood_4", "33,34": "wood_wall_8::obstacle", "33,35": "wood_wall_3::obstacle", "34,10": "wood_wall_3::obstacle", "34,11": "carpet_4", "34,12": "carpet_4", "34,13": "carpet_4", "34,14": "carpet_4", "34,15": "carpet_4", "34,16": "carpet_4", "34,17": "carpet_4", "34,18": "carpet_4", "34,19": "wood_wall_10::obstacle", "34,20": "wood_wall_3::obstacle", "34,21": "wood_4", "34,22": "wood_4", "34,23": "wood_4", "34,24": "wood_4", "34,25": "wood_4", "34,26": "wood_4", "34,27": "wood_4", "34,28": "wood_4", "34,29": "wood_4", "34,30": "wood_4", "34,31": "wood_4", "34,32": "wood_4", "34,33": "wood_4", "34,34": "wood_wall_8::obstacle", "34,35": "wood_wall_3::obstacle", "35,10": "wood_wall_3::obstacle", "35,11": "carpet_4", "35,12": "carpet_4", "35,13": "carpet_4", "35,14": "carpet_4", "35,15": "carpet_4", "35,16": "carpet_4", "35,17": "carpet_4", "35,18": "carpet_4", "35,19": "wood_wall_8::obstacle", "35,20": "wood_wall_3::obstacle", "35,21": "wood_4", "35,22": "wood_4", "35,23": "wood_4", "35,24": "wood_4", "35,25": "wood_4", "35,26": "wood_4", "35,27": "wood_4", "35,28": "wood_4", "35,29": "wood_4", "35,30": "wood_4", "35,31": "wood_4", "35,32": "wood_4", "35,33": "wood_4", "35,34": "wood_wall_8::obstacle", "35,35": "wood_wall_3::obstacle", "36,10": "wood_wall_7::obstacle", "36,11": "wood_wall_7::obstacle", "36,12": "wood_wall_7::obstacle", "36,13": "wood_wall_7::obstacle", "36,14": "wood_wall_7::obstacle", "36,15": "wood_wall_7::obstacle", "36,16": "wood_wall_7::obstacle", "36,17": "wood_wall_7::obstacle", "36,18": "wood_wall_7::obstacle", "36,19": "wood_wall_19::obstacle", "36,20": "wood_wall_3::obstacle", "36,21": "wood_4", "36,22": "wood_4", "36,23": "wood_4", "36,24": "wood_4", "36,25": "wood_4", "36,26": "wood_4", "36,27": "wood_4", "36,28": "wood_4", "36,29": "wood_4", "36,30": "wood_4", "36,31": "wood_4", "36,32": "wood_4", "36,33": "wood_4", "36,34": "wood_wall_8::obstacle", "36,35": "wood_wall_3::obstacle", "37,10": "wood_4", "37,11": "wood_4", "37,12": "wood_4", "37,13": "wood_4", "37,14": "wood_4", "37,15": "wood_4", "37,16": "wood_4", "37,17": "wood_4", "37,18": "wood_4", "37,19": "wood_4", "37,20": "wood_4", "37,21": "wood_4", "37,22": "wood_4", "37,23": "wood_4", "37,24": "wood_4", "37,25": "wood_4", "37,26": "wood_4", "37,27": "wood_4", "37,28": "wood_4", "37,29": "wood_4", "37,30": "wood_4", "37,31": "wood_4", "37,32": "wood_4", "37,33": "wood_4", "37,34": "wood_wall_8::obstacle", "37,35": "wood_wall_3::obstacle", "38,10": "wood_4", "38,11": "wood_4", "38,12": "wood_4", "38,13": "wood_4", "38,14": "wood_4", "38,15": "wood_4", "38,16": "wood_4", "38,17": "wood_4", "38,18": "wood_4", "38,19": "wood_4", "38,20": "wood_4", "38,21": "wood_4", "38,22": "wood_4", "38,23": "wood_4", "38,24": "wood_4", "38,25": "wood_4", "38,26": "wood_4", "38,27": "wood_4", "38,28": "wood_4", "38,29": "wood_4", "38,30": "wood_4", "38,31": "wood_4", "38,32": "wood_4", "38,33": "wood_4", "38,34": "wood_wall_8::obstacle", "38,35": "wood_wall_3::obstacle", "39,10": "wood_4", "39,11": "wood_4", "39,12": "wood_4", "39,13": "wood_4", "39,14": "wood_4", "39,15": "wood_4", "39,16": "wood_4", "39,17": "wood_4", "39,18": "wood_4", "39,19": "wood_4", "39,20": "wood_4", "39,21": "wood_4", "39,22": "wood_4", "39,23": "wood_4", "39,24": "wood_4", "39,25": "wood_4", "39,26": "wood_4", "39,27": "wood_4", "39,28": "wood_4", "39,29": "wood_4", "39,30": "wood_4", "39,31": "wood_4", "39,32": "wood_4", "39,33": "wood_4", "39,34": "wood_wall_8::obstacle", "39,35": "wood_wall_3::obstacle", "40,10": "wood_4", "40,11": "wood_4", "40,12": "wood_4", "40,13": "wood_4", "40,14": "wood_4", "40,15": "wood_4", "40,16": "wood_4", "40,17": "wood_4", "40,18": "wood_4", "40,19": "wood_4", "40,20": "wood_4", "40,21": "wood_4", "40,22": "wood_4", "40,23": "wood_4", "40,24": "wood_4", "40,25": "wood_4", "40,26": "wood_4", "40,27": "wood_4", "40,28": "wood_4", "40,29": "wood_4", "40,30": "wood_4", "40,31": "wood_4", "40,32": "wood_4", "40,33": "wood_4", "40,34": "wood_wall_8::obstacle", "40,35": "wood_wall_3::obstacle", "41,10": "wood_4", "41,11": "wood_4", "41,12": "wood_4", "41,13": "wood_4", "41,14": "wood_4", "41,15": "wood_4", "41,16": "wood_4", "41,17": "wood_4", "41,18": "wood_4", "41,19": "wood_4", "41,20": "wood_4", "41,21": "wood_4", "41,22": "wood_4", "41,23": "wood_4", "41,24": "wood_4", "41,25": "wood_4", "41,26": "wood_4", "41,27": "wood_4", "41,28": "wood_4", "41,29": "wood_4", "41,30": "wood_4", "41,31": "wood_4", "41,32": "wood_4", "41,33": "wood_4", "41,34": "wood_wall_8::obstacle", "41,35": "wood_wall_3::obstacle", "42,10": "wood_4", "42,11": "wood_4", "42,12": "wood_4", "42,13": "wood_4", "42,14": "wood_4", "42,15": "wood_4", "42,16": "wood_4", "42,17": "wood_4", "42,18": "wood_4", "42,19": "wood_4", "42,20": "wood_4", "42,21": "wood_4", "42,22": "wood_4", "42,23": "wood_4", "42,24": "wood_4", "42,25": "wood_4", "42,26": "wood_4", "42,27": "wood_4", "42,28": "wood_4", "42,29": "wood_4", "42,30": "wood_4", "42,31": "wood_4", "42,32": "wood_4", "42,33": "wood_4", "42,34": "wood_wall_8::obstacle", "42,35": "wood_wall_3::obstacle", "43,10": "wood_wall_3::obstacle", "43,11": "stone_2", "43,12": "stone_2", "43,13": "stone_2", "43,14": "stone_2", "43,15": "stone_2", "43,16": "stone_2", "43,17": "stone_2", "43,18": "stone_2", "43,19": "wood_wall_18@1::obstacle", "43,20": "wood_wall_7::obstacle", "43,21": "wood_wall_7::obstacle", "43,22": "wood_wall_7::obstacle", "43,23": "wood_wall_7::obstacle", "43,24": "wood_wall_7::obstacle", "43,25": "wood_wall_7::obstacle", "43,26": "wood_wall_7::obstacle", "43,27": "wood_wall_7::obstacle", "43,28": "wood_wall_7::obstacle", "43,29": "wood_wall_7::obstacle", "43,30": "wood_wall_7::obstacle", "43,31": "wood_wall_7::obstacle", "43,32": "wood_wall_7::obstacle", "43,33": "wood_wall_7::obstacle", "43,34": "wood_wall_19", "43,35": "wood_wall_3::obstacle", "44,10": "wood_wall_3::obstacle", "44,11": "stone_2", "44,12": "stone_2", "44,13": "stone_2", "44,14": "stone_2", "44,15": "stone_2", "44,16": "stone_2", "44,17": "stone_2", "44,18": "stone_2", "44,19": "wood_wall_8@14::obstacle", "44,20": "wood_wall_3::obstacle", "44,21": "wood_wall_3::obstacle", "44,22": "grass_4", "44,23": "grass_4", "44,24": "grass_4", "44,25": "grass_4", "44,26": "grass_4", "44,27": "grass_4", "44,28": "grass_4", "44,29": "grass_4", "44,30": "grass_4", "44,31": "grass_4", "44,32": "grass_4", "44,33": "grass_4", "44,34": "grass_4", "44,35": "grass_4", "45,10": "wood_wall_3::obstacle", "45,11": "stone_2", "45,12": "stone_2", "45,13": "stone_2", "45,14": "stone_2", "45,15": "stone_2", "45,16": "stone_2", "45,17": "stone_2", "45,18": "stone_2", "45,19": "wood_wall_9@14::obstacle", "45,20": "wood_wall_3::obstacle", "45,21": "wood_wall_3::obstacle", "45,22": "grass_4", "45,23": "grass_4", "45,24": "grass_4", "45,25": "grass_4", "45,26": "grass_4", "45,27": "grass_4", "45,28": "grass_4", "45,29": "grass_4", "45,30": "grass_4", "45,31": "grass_4", "45,32": "grass_4", "45,33": "grass_4", "45,34": "grass_4", "45,35": "grass_4", "46,10": "grass_4", "46,11": "grass_4", "46,12": "grass_4", "46,13": "grass_4", "46,14": "grass_4", "46,15": "grass_4", "46,16": "grass_4", "46,17": "grass_4", "46,18": "grass_4", "46,19": "grass_4", "46,20": "grass_4", "46,21": "grass_4", "46,22": "grass_4", "46,23": "grass_4", "46,24": "grass_4", "46,25": "grass_4", "46,26": "grass_4", "46,27": "grass_4", "46,28": "grass_4", "46,29": "grass_4", "46,30": "grass_4", "46,31": "grass_4", "46,32": "grass_4", "46,33": "grass_4", "46,34": "grass_4", "46,35": "grass_4", "47,10": "grass_4", "47,11": "grass_4", "47,12": "grass_4", "47,13": "grass_4", "47,14": "grass_4", "47,15": "grass_4", "47,16": "grass_4", "47,17": "grass_4", "47,18": "grass_4", "47,19": "grass_4", "47,20": "grass_4", "47,21": "grass_4", "47,22": "grass_4", "47,23": "grass_4", "47,24": "grass_4", "47,25": "grass_4", "47,26": "grass_4", "47,27": "grass_4", "47,28": "grass_4", "47,29": "grass_4", "47,30": "grass_4", "47,31": "grass_4", "47,32": "grass_4", "47,33": "grass_4", "47,34": "grass_4", "47,35": "grass_4", "spawn_point": "0,27", "freeform:deco_1794716962898_dd037": "office_two/Copy (3) sprite-8-3|none::252,1516::solid::behind::layer:0", "freeform:deco_1794716986731_u04x4": "office_one/Copy (2) sprite-5-1|none::236,1530::passable::ontop::layer:0", "freeform:deco_1794716996623_rnyut": "office_one/Copy (2) sprite-5-1|none::112,1533::passable::ontop::layer:1", "freeform:deco_1794717068972_656b4": "office_two/sprite-8-2-2|none::99,1516::solid::behind::layer:1", "freeform:deco_1794717941316_cx6ci": "office_two/gov-tile-B-01_sprite_50_96x69|none::102,1686::solid::behind::layer:0", "freeform:deco_1794717945349_nvfog": "office_two/gov-tile-B-01_sprite_50_96x69|none::250,1687::solid::behind::layer:0", "freeform:deco_1794744670131_idi32": "office_one/sprite-2-4-1|none::90,1649::passable::behind::layer:-1", "freeform:deco_1794744672914_oohoh": "office_one/sprite-2-4-1|none::237,1650::passable::behind::layer:-1", "freeform:deco_1794744793996_zclrh": "office_two/Copy (1) sprite-1-2|none::501,1605::passable::behind::layer:-1", "freeform:deco_1794744895471_ir968": "office_two/sprite-1-4|none::848,1539::passable::behind::layer:-1", "freeform:deco_1794744904045_c3rfk": "office_two/sprite-1-4|none::847,1644::passable::behind::layer:-1", "freeform:deco_1794744907903_ysw3u": "office_two/sprite-1-4|none::701,1540::passable::behind::layer:-1", "freeform:deco_1794744911529_kqall": "office_two/sprite-1-4|none::701,1647::passable::behind::layer:-1", "freeform:deco_1794744937179_y2mvo": "office_one/Copy (1) sprite-6-3|none::370,1491::passable::behind::layer:-1", "freeform:deco_1794744941878_p8pgz": "office_one/Copy (1) sprite-6-3|none::372,1698::passable::behind::layer:-1", "freeform:deco_1794744978512_y015k": "office_one/Copy (1) sprite-6-3|none::578,1491::passable::behind::layer:-1", "freeform:deco_1794745146910_nsau4": "office_one/sprite-7-7|none::1000,1511::passable::behind::layer:-1", "freeform:deco_1794745256310_b94s8": "office_one/gov-tile-B-02_sprite_26_44x91|none::1174,1504::passable::behind::layer:-1", "freeform:deco_1794745280409_c2yl6": "office_one/gov-tile-B-02_sprite_26_44x91|none::1126,1504::passable::behind::layer:-1", "freeform:deco_1794745343476_aqum2": "office_two/sprite-1-2|none::1078,1619::passable::behind::layer:-1", "freeform:deco_1794745495327_kgmae": "office_one/sprite-10-3|none::970,562::passable::behind::layer:-1", "freeform:deco_1794745505627_8faef": "office_one/sprite-10-3|none::970,622::passable::behind::layer:0", "freeform:deco_1794745513542_9i6dp": "office_one/sprite-10-3|none::970,682::passable::behind::layer:1", "freeform:deco_1794745522800_y3x1b": "office_one/sprite-10-3|none::970,743::passable::behind::layer:2", "freeform:deco_1794745531775_h6uhm": "office_one/sprite-10-3|none::970,803::passable::behind::layer:3", "freeform:deco_1794745538241_qgrnf": "office_one/sprite-10-3|none::970,864::passable::behind::layer:4", "freeform:deco_1794745542801_ffc9p": "office_one/sprite-10-3|none::970,927::passable::behind::layer:5", "freeform:deco_1794745596783_e7avl": "office_one/sprite-1-3|none::1009,554::passable::behind::layer:5", "freeform:deco_1794745598350_ou73y": "office_one/sprite-1-3|none::1007,610::passable::behind::layer:5", "freeform:deco_1794745600391_cjfew": "office_one/sprite-1-3|none::1007,671::passable::behind::layer:5", "freeform:deco_1794745602399_aeju3": "office_one/sprite-1-3|none::1007,733::passable::behind::layer:5", "freeform:deco_1794745604792_abw8p": "office_one/sprite-1-3|none::1007,790::passable::behind::layer:5", "freeform:deco_1794745606849_35nkq": "office_one/sprite-1-3|none::1006,851::passable::behind::layer:5", "freeform:deco_1794745609074_c7kzm": "office_one/sprite-1-3|none::1007,917::passable::behind::layer:5", "freeform:deco_1794799354913_vrnnh": "office_one/sprite-10-3|none::1180,562::passable::behind::layer:0", "freeform:deco_1794799361562_3hszs": "office_one/sprite-10-3|none::1180,622::passable::behind::layer:1", "freeform:deco_1794799366896_yf50m": "office_one/sprite-10-3|none::1180,682::passable::behind::layer:2", "freeform:deco_1794799375029_i9o9j": "office_one/sprite-10-3|none::1180,742::passable::behind::layer:3", "freeform:deco_1794799380521_tfjri": "office_one/sprite-10-3|none::1180,803::passable::behind::layer:4", "freeform:deco_1794799395621_bebp4": "office_one/sprite-10-3|none::1180,864::passable::behind::layer:5", "freeform:deco_1794799401621_87303": "office_one/sprite-10-3|none::1180,925::passable::behind::layer:6", "freeform:deco_1794799510828_u4fwg": "office_one/sprite-1-1|none::1141,553::passable::behind::layer:6", "freeform:deco_1794799516561_bpafb": "office_one/sprite-1-1|none::1142,614::passable::behind::layer:6", "freeform:deco_1794799519953_wa4kd": "office_one/sprite-1-1|none::1143,672::passable::behind::layer:6", "freeform:deco_1794799522069_wpo6m": "office_one/sprite-1-1|none::1142,734::passable::behind::layer:6", "freeform:deco_1794799524078_mwcza": "office_one/sprite-1-1|none::1143,794::passable::behind::layer:6", "freeform:deco_1794799525628_iltxr": "office_one/sprite-1-1|none::1144,854::passable::behind::layer:6", "freeform:deco_1794799527237_g8w2x": "office_one/sprite-1-1|none::1143,920::passable::behind::layer:6", "freeform:deco_1794799566212_o3k07": "office_one/sprite-13-7|none::1075,586::passable::behind::layer:6", "freeform:deco_1794799567811_5brh8": "office_one/sprite-13-7|none::1074,686::passable::behind::layer:6", "freeform:deco_1794799569136_2d76d": "office_one/sprite-13-7|none::1074,786::passable::behind::layer:6", "freeform:deco_1794799579753_3cmrm": "office_one/sprite-13-7|none::1077,885::passable::behind::layer:6", "freeform:deco_1794800064409_fnylj": "office_one/Copy (1) sprite-2-5|none::155,1048::passable::behind::layer:0", "freeform:deco_1794800076442_f1a79": "office_one/Copy (1) sprite-2-5|none::154,652::passable::behind::layer:0", "freeform:deco_1794800126134_spjfo": "office_one/Copy (1) sprite-14-1|none::93,841::passable::behind::layer:0", "freeform:deco_1794800127483_25nkc": "office_one/Copy (1) sprite-14-1|none::96,1040::passable::behind::layer:0", "freeform:deco_1794800128977_ok9xq": "office_one/Copy (1) sprite-14-1|none::95,637::passable::behind::layer:0", "freeform:deco_1794800149058_eagez": "office_one/sprite-13-4|none::211,1042::passable::behind::layer:0", "freeform:deco_1794800151625_fapfb": "office_one/sprite-13-4|none::212,843::passable::behind::layer:0", "freeform:deco_1794800153109_1ox0f": "office_one/sprite-13-4|none::207,640::passable::behind::layer:0", "freeform:deco_1794800193783_b8tly": "office_one/Copy (1) sprite-6-4|none::74,939::passable::behind::layer:0", "freeform:deco_1794800196816_6lzzm": "office_one/Copy (1) sprite-6-4|none::75,1149::passable::behind::layer:0", "freeform:deco_1794800199018_pshoj": "office_one/Copy (1) sprite-6-4|none::73,736::passable::behind::layer:0", "freeform:deco_1794800201359_uo2qn": "office_one/Copy (1) sprite-6-4|none::74,541::passable::behind::layer:0", "freeform:deco_1794800212282_qtaws": "office_one/Copy (1) sprite-6-4|none::251,542::passable::behind::layer:0", "freeform:deco_1794800216633_xtb54": "office_one/Copy (1) sprite-6-4|none::252,737::passable::behind::layer:0", "freeform:deco_1794800219174_2nagl": "office_one/Copy (1) sprite-6-4|none::252,941::passable::behind::layer:0", "freeform:deco_1794800226249_ec3qw": "office_one/Copy (1) sprite-6-4|none::249,1148::passable::behind::layer:0", "freeform:deco_1794800410777_zyn6j": "office_two/Copy (1) sprite-5-5|none::700,622::passable::behind::layer:0", "freeform:deco_1794800423177_1jgsr": "office_two/sprite-12-11|none::773,697::passable::behind::layer:0", "freeform:deco_1794800432439_g9yv7": "office_two/sprite-16-3|none::700,769::passable::behind::layer:0", "freeform:deco_1794800540093_bxxjm": "office_one/sprite-15-2|none::701,701::passable::behind::layer:0", "freeform:deco_1794801948777_zayyn": "office_two/sprite-12-11|none::627,696::passable::behind::layer:0::flipx", "freeform:deco_1794802236692_raz4i": "office_two/Copy (1) sprite-5-5|none::699,957::passable::behind::layer:0::flipx", "freeform:deco_1794802252800_2rzve": "office_two/sprite-12-11|none::628,1036::passable::behind::layer:0::flipx", "freeform:deco_1794802257586_qi6wq": "office_two/sprite-12-11|none::774,1039::passable::behind::layer:0", "freeform:deco_1794802263711_iy05f": "office_two/sprite-16-3|none::699,1108::passable::behind::layer:0", "freeform:deco_1794802292149_0wkxk": "office_one/sprite-15-2|none::699,1035::passable::behind::layer:0", "freeform:deco_1794803056274_4m0wz": "office_one/gov-tile-B-01_sprite_73_48x96|none::882,851::passable::behind::layer:0", "freeform:deco_1794803067207_kdi42": "office_one/gov-tile-B-02_sprite_27_36x38|none::884,495::passable::behind::layer:0", "freeform:deco_1794803070366_2qat9": "office_one/gov-tile-B-02_sprite_27_36x38|none::884,1281::passable::behind::layer:0", "freeform:deco_1794803107091_vsje7": "office_one/Copy (1) sprite-9-4|none::701,844::passable::behind::layer:0", "freeform:deco_1794803108433_o2tpi": "office_one/Copy (1) sprite-9-4|none::744,844::passable::behind::layer:0", "freeform:deco_1794803110932_xho60": "office_one/Copy (1) sprite-9-4|none::788,844::passable::behind::layer:0", "freeform:deco_1794803117582_2932l": "office_one/Copy (1) sprite-9-4|none::658,844::passable::behind::layer:0", "freeform:deco_1794803120682_yv9fn": "office_one/Copy (1) sprite-9-4|none::614,844::passable::behind::layer:0", "freeform:deco_1794807330103_thuzv": "office_one/Copy (1) sprite-9-4|none::454,1264::passable::behind::layer:17", "freeform:deco_1794807338695_ghxog": "office_one/Copy (1) sprite-9-4|none::454,1215::passable::behind::layer:16", "freeform:deco_1794807343179_8voyd": "office_one/Copy (1) sprite-9-4|none::454,1166::passable::behind::layer:15", "freeform:deco_1794807351803_ewqqp": "office_one/Copy (1) sprite-9-4|none::455,1115::passable::behind::layer:14", "freeform:deco_1794807388986_16prq": "office_one/Copy (1) sprite-9-4|none::455,1066::passable::behind::layer:13", "freeform:deco_1794807393945_vsnga": "office_one/Copy (1) sprite-9-4|none::455,1016::passable::behind::layer:12", "freeform:deco_1794807397311_o35f9": "office_one/Copy (1) sprite-9-4|none::455,965::passable::behind::layer:11", "freeform:deco_1794807402203_dj5o6": "office_one/Copy (1) sprite-9-4|none::454,915::passable::behind::layer:10", "freeform:deco_1794807407678_39r8l": "office_one/Copy (1) sprite-9-4|none::454,865::passable::behind::layer:9", "freeform:deco_1794807411569_7j8u8": "office_one/Copy (1) sprite-9-4|none::454,816::passable::behind::layer:8", "freeform:deco_1794807416570_nsl2w": "office_one/Copy (1) sprite-9-4|none::454,766::passable::behind::layer:7", "freeform:deco_1794807423111_501ko": "office_one/Copy (1) sprite-9-4|none::454,716::passable::behind::layer:6", "freeform:deco_1794807427378_g82aq": "office_one/Copy (1) sprite-9-4|none::454,665::passable::behind::layer:4", "freeform:deco_1794807431378_tc93m": "office_one/Copy (1) sprite-9-4|none::454,616::passable::behind::layer:3", "freeform:deco_1794807435795_dg53i": "office_one/Copy (1) sprite-9-4|none::454,566::passable::behind::layer:2", "freeform:deco_1794807441628_w1doq": "office_one/Copy (1) sprite-9-4|none::455,516::passable::behind::layer:1", "freeform:deco_1794807867238_upvgz": "office_one/sprite-5-7|none::300,828::passable::behind::layer:0", "freeform:deco_1794807877130_vocxm": "office_one/sprite-5-7|none::300,1028::passable::behind::layer:0", "freeform:deco_1794807881996_bkeui": "office_one/sprite-5-7|none::300,629::passable::behind::layer:0", "freeform:deco_1794808065011_2krtg": "office_two/Copy (2) sprite-1-5|none::99,125::passable::behind::layer:0", "freeform:deco_1794808107496_haak7": "office_one/sprite-5-2 copy|none::277,119::passable::behind::layer:0", "freeform:deco_1794808110644_xmnis": "office_one/sprite-5-2 copy|none::228,119::passable::behind::layer:0", "freeform:deco_1794808276933_hw2d5": "office_one/gov-tile-B-02_sprite_07_93x86|none::246,249::passable::behind::layer:0", "freeform:deco_1794816508185_8a8yb": "office_one/Copy (1) sprite-2-5|none::154,844::passable::behind::layer:0", "freeform:deco_1794819288580_vstji": "office_one/sprite-7-2|none::474,98::passable::behind::layer:0", "freeform:deco_1794819300588_mmpfc": "office_one/sprite-6-2|none::413,179::passable::behind::layer:0", "freeform:deco_1794819304697_1avoz": "office_one/sprite-6-2|none::457,179::passable::behind::layer:0", "freeform:deco_1794819310680_rk8fv": "office_one/sprite-6-2|none::500,179::passable::behind::layer:0", "freeform:deco_1794819316314_vliw8": "office_one/sprite-6-2|none::544,179::passable::behind::layer:0", "freeform:deco_1794819320472_mk0vj": "office_one/sprite-6-2|none::415,233::passable::behind::layer:0", "freeform:deco_1794819323163_a5b8f": "office_one/sprite-6-2|none::457,234::passable::behind::layer:0", "freeform:deco_1794819326397_qjwxa": "office_one/sprite-6-2|none::500,235::passable::behind::layer:0", "freeform:deco_1794819329579_pk7mr": "office_one/sprite-6-2|none::544,235::passable::behind::layer:0", "freeform:deco_1794819350830_whld8": "office_one/sprite-8-4|none::374,118::passable::ontop::layer:0", "freeform:deco_1794819599673_vekcw": "office_one/gov-tile-B-02_sprite_06_93x96|none::1300,1506::passable::behind::layer:0", "freeform:deco_1794819602422_z8lko": "office_one/gov-tile-B-02_sprite_06_93x96|none::1450,1507::passable::behind::layer:0", "freeform:deco_1794819621248_hawew": "office_one/gov-tile-B-02_sprite_06_93x96|none::1301,1590::passable::ontop::layer:1", "freeform:deco_1794819624971_tp1cy": "office_one/gov-tile-B-02_sprite_06_93x96|none::1450,1591::passable::ontop::layer:1", "freeform:deco_1794819641738_b6i4g": "office_one/gov-tile-B-02_sprite_06_93x96|none::1301,1673::passable::ontop::layer:2", "freeform:deco_1794819648863_cmcbz": "office_one/gov-tile-B-02_sprite_06_93x96|none::1450,1674::passable::ontop::layer:2", "freeform:deco_1794819880487_soe1k": "office_two/gov-tile-B-01_sprite_51_96x69|none::701,154::passable::ontop::layer:6", "freeform:deco_1794819884887_cxpzp": "office_two/gov-tile-B-01_sprite_51_96x69|none::849,153::passable::ontop::layer:6", "freeform:deco_1794819890230_uoaj9": "office_two/gov-tile-B-01_sprite_51_96x69|none::701,280::passable::ontop::layer:6", "freeform:deco_1794819893720_5sbbt": "office_two/gov-tile-B-01_sprite_51_96x69|none::849,280::passable::ontop::layer:6", "freeform:deco_1794819909545_ymvns": "office_one/gov-tile-B-01_sprite_14_48x71|none::706,115::passable::behind::layer:5", "freeform:deco_1794819911870_768fq": "office_one/gov-tile-B-01_sprite_14_48x71|none::854,115::passable::behind::layer:5", "freeform:deco_1794819913770_swa2y": "office_one/gov-tile-B-01_sprite_14_48x71|none::703,244::passable::behind::layer:5", "freeform:deco_1794819915921_auun2": "office_one/gov-tile-B-01_sprite_14_48x71|none::853,242::passable::behind::layer:5", "freeform:deco_1794820020831_bbuo7": "office_one/gov-tile-B-02_sprite_27_36x38|none::775,92::passable::behind::layer:5", "freeform:deco_1794820041160_70435": "office_one/sprite-4-2|none::366,278::passable::behind::layer:5", "freeform:deco_1794820043544_1x6zw": "office_one/sprite-4-2|none::583,278::passable::behind::layer:5", "freeform:deco_1794820046194_huybl": "office_one/sprite-4-2|none::582,101::passable::behind::layer:5", "freeform:deco_1794820048552_npbng": "office_one/sprite-4-2|none::66,279::passable::behind::layer:5", "freeform:deco_1794820056444_yhkiy": "office_one/sprite-4-2|none::667,88::passable::behind::layer:5", "freeform:deco_1794820058478_ktdlt": "office_one/sprite-4-2|none::883,89::passable::behind::layer:5", "freeform:deco_1794820367055_78jsz": "office_one/gov-tile-B-01_sprite_31_96x124|none::1150,119::passable::behind::layer:5", "freeform:deco_1794820377464_aprz8": "office_one/gov-tile-B-01_sprite_31_96x124|none::1000,119::passable::behind::layer:5", "freeform:deco_1794820387863_yqibz": "office_one/Copy (2) sprite-7-1|none::1075,139::passable::behind::layer:5", "freeform:deco_1794820436922_1p8yh": "office_one/Copy (2) sprite-6-1|none::1025,228::passable::behind::layer:5", "freeform:deco_1794820441588_kiczn": "office_one/Copy (2) sprite-10-4|none::1075,234::passable::behind::layer:5", "freeform:deco_1794820446072_uf9jz": "office_one/Copy (2) sprite-6-3|none::1126,228::passable::behind::layer:5", "freeform:deco_1794822213486_hq4ej": "office_two/Copy (2) sprite-1-7|none::1298,105::passable::behind::layer:0", "freeform:deco_1794822222619_5227m": "office_two/Copy (2) sprite-1-7|none::1451,104::passable::behind::layer:0::flipx", "freeform:deco_1794822265419_i5ypc": "office_two/sprite-7-3-1|none::1301,235::passable::behind::layer:0::flipx", "freeform:deco_1794822271810_vmr9e": "office_two/sprite-7-3-1|none::1449,234::passable::behind::layer:0::flipx", "freeform:deco_1794822292878_7c4nk": "office_one/sprite-5-11|none::1378,93::passable::behind::layer:0::flipx", "freeform:deco_1794822493761_lvgpl": "office_two/gov-tile-B-02_sprite_02_96x75|none::1301,612::passable::ontop::layer:1::flipx", "freeform:deco_1794822501426_rq5s2": "office_two/gov-tile-B-02_sprite_02_96x75|none::1449,613::passable::ontop::layer:1::flipx", "freeform:deco_1794822524019_b73f5": "office_two/gov-tile-B-02_sprite_02_96x75|none::1301,712::passable::ontop::layer:3::flipx", "freeform:deco_1794822528043_2sp08": "office_two/gov-tile-B-02_sprite_02_96x75|none::1449,713::passable::ontop::layer:1::flipx", "freeform:deco_1794822531310_g4or7": "office_two/gov-tile-B-02_sprite_02_96x75|none::1301,812::passable::ontop::layer:1::flipx", "freeform:deco_1794822533768_4k5fu": "office_two/gov-tile-B-02_sprite_02_96x75|none::1449,813::passable::ontop::layer:1::flipx", "freeform:deco_1794822540926_p26jf": "office_two/gov-tile-B-02_sprite_02_96x75|none::1301,917::passable::ontop::layer:1::flipx", "freeform:deco_1794822544960_2bnd4": "office_two/gov-tile-B-02_sprite_02_96x75|none::1450,917::passable::ontop::layer:1::flipx", "freeform:deco_1794822597642_vt5z4": "office_one/sprite-3-3-2|none::1299,574::passable::behind::layer:0::flipx", "freeform:deco_1794822602859_rb3td": "office_one/sprite-3-3-2|none::1447,571::passable::behind::layer:0::flipx", "freeform:deco_1794822607184_ut3i8": "office_one/sprite-3-3-2|none::1299,670::passable::behind::layer:2::flipx", "freeform:deco_1794822609651_ondat": "office_one/sprite-3-3-2|none::1447,673::passable::behind::layer:0::flipx", "freeform:deco_1794822627063_7es4m": "office_one/sprite-3-3-1|none::1299,772::passable::behind::layer:0::flipx", "freeform:deco_1794822631105_eoaqj": "office_one/sprite-3-3-1|none::1447,773::passable::behind::layer:0::flipx", "freeform:deco_1794822633363_l8dli": "office_one/sprite-3-3-1|none::1299,877::passable::behind::layer:0::flipx", "freeform:deco_1794822635473_pt9im": "office_one/sprite-3-3-1|none::1447,877::passable::behind::layer:0::flipx", "freeform:deco_1794822886766_s6omt": "office_one/sprite-5-11|none::1265,533::passable::behind::layer:0", "freeform:deco_1794822888624_zjtx2": "office_one/sprite-5-11|none::1484,535::passable::behind::layer:0", "freeform:deco_1794823255648_0s0k6": "office_one/sprite-8-6|none::1601,607::passable::ontop::layer:0", "freeform:deco_1794823263039_hvpw0": "office_one/sprite-7-7|none::1748,602::passable::ontop::layer:0", "freeform:deco_1794823271831_9zfwp": "office_one/sprite-10-5|none::1624,713::passable::behind::layer:0", "freeform:deco_1794823274323_247lt": "office_one/sprite-10-5|none::1749,713::passable::behind::layer:0", "freeform:deco_1794823276739_fhrm9": "office_one/sprite-10-5|none::1627,786::passable::behind::layer:0", "freeform:deco_1794823278306_hnwtv": "office_one/sprite-10-5|none::1746,789::passable::behind::layer:0", "freeform:deco_1794823286889_9zjd9": "office_one/sprite-10-5|none::1625,863::passable::behind::layer:0", "freeform:deco_1794823288773_i8njk": "office_one/sprite-10-5|none::1748,861::passable::behind::layer:0", "freeform:deco_1794823318931_6kyzw": "office_one/sprite-13-7|none::1566,538::passable::behind::layer:0", "freeform:deco_1794823320698_o0hcg": "office_one/sprite-13-7|none::1786,534::passable::behind::layer:0", "freeform:deco_1794823323223_l9sqs": "office_one/sprite-13-7|none::1564,926::passable::behind::layer:0", "freeform:deco_1794823324931_sx3t6": "office_one/sprite-13-7|none::1789,927::passable::behind::layer:0", "freeform:deco_1794823472172_njq7v": "office_two/sprite-3-2|none::1026,1146::passable::behind::layer:0", "freeform:deco_1794823479940_gur8b": "office_two/sprite-3-2|none::1170,1146::passable::behind::layer:0", "freeform:deco_1794823482581_8a4g9": "office_two/sprite-3-2|none::1308,1146::passable::behind::layer:0", "freeform:deco_1794823488139_t43kf": "office_two/sprite-3-2|none::1451,1147::passable::behind::layer:0", "freeform:deco_1794823492064_zojeo": "office_two/sprite-3-2|none::1026,1280::passable::behind::layer:0", "freeform:deco_1794823496114_9zdrs": "office_two/sprite-3-2|none::1169,1278::passable::behind::layer:0", "freeform:deco_1794823501123_5e2om": "office_two/sprite-3-2|none::1310,1278::passable::behind::layer:0", "freeform:deco_1794823503881_9oyyh": "office_two/sprite-3-2|none::1451,1280::passable::behind::layer:0", "freeform:deco_1794823657088_xcj4r": "office_one/Copy (1) sprite-10-5|none::924,1336::passable::behind::layer:0::interact:organisation", "freeform:deco_1794878696585_o9nov": "office_one/Copy (2) sprite-9-2|none::1576,99::passable::behind::layer:0", "freeform:deco_1794878698734_c805o": "office_one/Copy (2) sprite-9-2|none::2124,100::passable::behind::layer:0", "freeform:deco_1794878702226_lrbnr": "office_one/Copy (2) sprite-9-2|none::1577,354::passable::behind::layer:0", "freeform:deco_1794878706109_uhrpf": "office_one/Copy (2) sprite-9-2|none::2121,359::passable::behind::layer:0", "freeform:deco_1794879099467_8kf2f": "office_one/gov-tile-B-01_sprite_25_96x96|none::1651,106::passable::behind::layer:0", "freeform:deco_1794879106707_e2pq8": "office_one/gov-tile-B-01_sprite_25_96x96|none::1749,106::passable::behind::layer:0", "freeform:deco_1794879117957_57cu4": "office_one/Copy (1) sprite-9-7|none::1872,117::passable::behind::layer:0::interact:notes", "freeform:deco_1794879122857_hkity": "office_one/Copy (1) sprite-9-7|none::1989,117::passable::behind::layer:0::interact:calendar", "freeform:deco_1794879164833_yk7f0": "office_two/Copy (1) sprite-1-2|none::1700,251::passable::behind::layer:0::flipx", "freeform:deco_1794879179057_dl7qv": "office_two/Copy (1) sprite-1-2|none::1952,251::passable::behind::layer:0", "freeform:deco_1794879526009_lxz9c": "office_one/Copy (2) sprite-12-2|none::2291,568::solid::behind::layer:0", "freeform:deco_1794879531917_3u3jz": "office_one/Copy (2) sprite-12-2|none::2291,624::solid::behind::layer:1", "freeform:deco_1794879539109_e0b90": "office_one/Copy (2) sprite-12-2|none::2291,680::solid::behind::layer:2", "freeform:deco_1794879544317_pgq3x": "office_one/Copy (2) sprite-12-2|none::2291,736::solid::behind::layer:3", "freeform:deco_1794879550001_hanhd": "office_one/Copy (2) sprite-12-2|none::2291,792::solid::behind::layer:4", "freeform:deco_1794879557326_364xm": "office_one/Copy (2) sprite-12-2|none::2291,848::solid::behind::layer:5", "freeform:deco_1794879563092_6x81w": "office_one/Copy (2) sprite-12-2|none::2291,904::solid::behind::layer:6", "freeform:deco_1794879568659_2fa3z": "office_one/Copy (2) sprite-12-2|none::2291,961::solid::behind::layer:7", "freeform:deco_1794880055409_vpprx": "office_one/Copy (2) sprite-12-4|none::2216,584::passable::behind::layer:7", "freeform:deco_1794880058963_7i2fz": "office_one/Copy (2) sprite-12-4|none::2216,762::passable::behind::layer:7", "freeform:deco_1794880061559_o93v4": "office_one/Copy (2) sprite-12-4|none::2216,916::passable::behind::layer:7", "freeform:deco_1794880109205_lviic": "office_one/Copy (2) sprite-12-3|none::2260,571::passable::behind::layer:7::flipx", "freeform:deco_1794880115430_dg3ah": "office_one/Copy (2) sprite-12-3|none::2260,629::passable::behind::layer:8::flipx", "freeform:deco_1794880122021_r3vgx": "office_one/Copy (2) sprite-12-3|none::2260,687::passable::behind::layer:9::flipx", "freeform:deco_1794880126613_fum10": "office_one/Copy (2) sprite-12-3|none::2260,745::passable::behind::layer:10::flipx", "freeform:deco_1794880132789_fi8fy": "office_one/Copy (2) sprite-12-3|none::2260,803::passable::behind::layer:11::flipx", "freeform:deco_1794880139646_dw24q": "office_one/Copy (2) sprite-12-3|none::2260,861::passable::behind::layer:12::flipx", "freeform:deco_1794880147222_scluo": "office_one/Copy (2) sprite-12-3|none::2260,920::passable::behind::layer:13::flipx", "freeform:deco_1794980197449_s2jo0": "office_one/Copy (1) sprite-7-5|none::2148,521::passable::behind::layer:0", "freeform:deco_1794980206023_l68gf": "office_one/Copy (1) sprite-7-5|none::2148,946::passable::behind::layer:0", "freeform:deco_1794980255906_7cu0m": "living_room_one/Copy (2) sprite-7-1|none::1923,572::passable::behind::layer:0", "freeform:deco_1794980257682_pb2wo": "living_room_one/Copy (2) sprite-7-1|none::2016,572::passable::behind::layer:0", "freeform:deco_1794980262297_v703y": "living_room_one/Copy (2) sprite-7-1|none::1923,665::passable::behind::layer:0", "freeform:deco_1794980265615_le3sa": "living_room_one/Copy (2) sprite-7-1|none::2017,665::passable::behind::layer:0", "freeform:deco_1794980277673_odku4": "pet_shop/tile-B-01 15_sprite_80_48x48|none::2017,607::passable::behind::layer:1", "freeform:deco_1794980289614_qe5vq": "pet_shop/tile-B-02 13_sprite_67_48x48|none::1922,663::passable::behind::layer:1", "freeform:deco_1794980295639_dehle": "pet_shop/tile-B-02 13_sprite_181_48x48|none::1948,561::passable::behind::layer:1", "freeform:deco_1794980319464_bhr0p": "office_two/sprite-12-11|none::2021,810::passable::behind::layer:1", "freeform:deco_1794980332548_4ymgo": "office_two/sprite-12-11|none::1918,810::passable::behind::layer:1::flipx", "freeform:deco_1794980342331_a7sgz": "office_one/Copy (1) sprite-13-5|none::1969,811::passable::behind::layer:1::flipx", "freeform:deco_1794980359214_s9qca": "office_one/Copy (1) sprite-9-4|none::1871,730::passable::behind::layer:1::flipx", "freeform:deco_1794980360814_5estz": "office_one/Copy (1) sprite-9-4|none::1915,730::passable::behind::layer:1::flipx", "freeform:deco_1794980363689_gfa2u": "office_one/Copy (1) sprite-9-4|none::1959,730::passable::behind::layer:1::flipx", "freeform:deco_1794980366205_90xvq": "office_one/Copy (1) sprite-9-4|none::2004,731::passable::behind::layer:1::flipx", "freeform:deco_1794980369381_jlgih": "office_one/Copy (1) sprite-9-4|none::2049,731::passable::behind::layer:1::flipx", "freeform:deco_1794980387763_jlkav": "office_one/Copy (1) sprite-9-4|none::1872,901::passable::behind::layer:1::flipx", "freeform:deco_1794980389722_hm09m": "office_one/Copy (1) sprite-9-4|none::1915,901::passable::behind::layer:1::flipx", "freeform:deco_1794980393022_d5gfi": "office_one/Copy (1) sprite-9-4|none::1958,901::passable::behind::layer:1::flipx", "freeform:deco_1794980396922_fbptj": "office_one/Copy (1) sprite-9-4|none::2002,901::passable::behind::layer:1::flipx", "freeform:deco_1794980398547_cxj4h": "office_one/Copy (1) sprite-9-4|none::2046,901::passable::behind::layer:1::flipx", "freeform:deco_1794980412597_cnav5": "office_two/sprite-12-11|none::1914,991::passable::behind::layer:1::flipx", "freeform:deco_1794980422156_zfirl": "office_two/sprite-12-11|none::2019,988::passable::behind::layer:1", "freeform:deco_1794980430339_fj09y": "office_one/Copy (1) sprite-13-5|none::1971,992::passable::behind::layer:1"}	[{"id": "pz_1794814222590_c09a", "name": "Room 1", "bounds": {"maxCol": 5, "maxRow": 33, "minCol": 1, "minRow": 29}, "createdAt": 1794814222590}, {"id": "pz_1794814227581_sov7", "name": "Room 2", "bounds": {"maxCol": 11, "maxRow": 33, "minCol": 7, "minRow": 29}, "createdAt": 1794814227581}, {"id": "pz_1794815244404_j1yc", "name": "Room 3", "bounds": {"maxCol": 17, "maxRow": 33, "minCol": 13, "minRow": 29}, "createdAt": 1794815244404}, {"id": "pz_1794815251944_g2ff", "name": "Room 4", "bounds": {"maxCol": 23, "maxRow": 33, "minCol": 19, "minRow": 29}, "createdAt": 1794815251944}, {"id": "pz_1794815257445_hil7", "name": "Room 5", "bounds": {"maxCol": 29, "maxRow": 33, "minCol": 25, "minRow": 29}, "createdAt": 1794815257445}, {"id": "pz_1794815270744_voap", "name": "Room 6", "bounds": {"maxCol": 5, "maxRow": 6, "minCol": 1, "minRow": 1}, "createdAt": 1794815270744}, {"id": "pz_1794819404649_sdzc", "name": "Room 7", "bounds": {"maxCol": 11, "maxRow": 6, "minCol": 7, "minRow": 1}, "createdAt": 1794819404649}, {"id": "pz_1794819761259_qbyx", "name": "Room 8", "bounds": {"maxCol": 17, "maxRow": 6, "minCol": 13, "minRow": 1}, "createdAt": 1794819761259}, {"id": "pz_1794819778979_zrvv", "name": "Room 9", "bounds": {"maxCol": 23, "maxRow": 6, "minCol": 19, "minRow": 1}, "createdAt": 1794819778979}, {"id": "pz_1794819783838_yoms", "name": "Room 10", "bounds": {"maxCol": 29, "maxRow": 6, "minCol": 25, "minRow": 1}, "createdAt": 1794819783838}, {"id": "pz_1794820297306_pcva", "name": "Room 11", "bounds": {"maxCol": 23, "maxRow": 19, "minCol": 19, "minRow": 10}, "createdAt": 1794820297306}, {"id": "pz_1794820302497_hf5u", "name": "Room 12", "bounds": {"maxCol": 29, "maxRow": 19, "minCol": 25, "minRow": 10}, "createdAt": 1794820302497}, {"id": "pz_1794820305907_6qb9", "name": "Room 13", "bounds": {"maxCol": 35, "maxRow": 19, "minCol": 31, "minRow": 10}, "createdAt": 1794820305907}]	[{"x": 526, "y": 851, "id": "jukebox_1794824122282_9shr8", "layer": 0, "ontop": false, "spaceId": "space_central_plaza", "passable": true, "pausedAt": 0, "playlist": [], "isPlaying": false, "trackStartedAt": 0, "currentTrackIndex": 0}]	[{"x": 155, "y": 1036, "id": "typewriter_1794816609756_7log0", "layer": 1, "ontop": false, "spaceId": "space_central_plaza", "passable": true}]	[{"x": 2259, "y": 647, "id": "ashtray_1794880184678_nnf9w", "layer": 13, "ontop": false, "spaceId": "space_central_plaza", "passable": true}, {"x": 2259, "y": 839, "id": "ashtray_1794880187407_hfv7k", "layer": 13, "ontop": false, "spaceId": "space_central_plaza", "passable": true}]	[{"x": 154, "y": 837, "id": "chess_board_1794816535305_7837", "layer": 1, "ontop": false, "spaceId": "space_central_plaza", "passable": true}]	[{"x": 154, "y": 640, "id": "aquarium_1794816558929_1460", "layer": 1, "ontop": false, "spaceId": "space_central_plaza", "passable": true}]	[]	[]	auto	{"x": 175, "y": 1275, "id": "seller_space_central_plaza", "layer": 0, "enabled": true, "spaceId": "space_central_plaza", "shopTheme": "auto", "showCounter": true}
space_adventure_guild	Adventure Guild	Hangout Lounges	8	t	t	[]	2026-11-20 06:27:56.562724+00	2026-11-20 09:21:26.160031+00	{"0,0": "grass_4", "0,1": "grass_4", "0,2": "grass_4", "0,3": "grass_4", "0,4": "grass_4", "0,5": "grass_4", "0,6": "grass_4", "0,7": "grass_4", "0,8": "grass_4", "0,9": "grass_4", "1,0": "adventure_guild/guild_wall_corner_nw::obstacle", "1,1": "adventure_guild/guild_wall_cap_v::obstacle", "1,2": "adventure_guild/guild_wall_cap_v::obstacle", "1,3": "adventure_guild/guild_wall_cap_v::obstacle", "1,4": "adventure_guild/guild_wall_cap_v::obstacle", "1,5": "adventure_guild/guild_wall_cap_v::obstacle", "1,6": "adventure_guild/guild_wall_cap_v::obstacle", "1,7": "adventure_guild/guild_wall_cap_v::obstacle", "1,8": "adventure_guild/guild_wall_cap_v::obstacle", "1,9": "adventure_guild/guild_wall_cap_v::obstacle", "2,0": "adventure_guild/guild_wall_cap_h::obstacle", "2,1": "adventure_guild/guild_wall_timber_face::obstacle", "2,2": "adventure_guild/guild_floor_basalt", "2,3": "adventure_guild/guild_floor_basalt", "2,4": "adventure_guild/guild_floor_basalt", "2,5": "adventure_guild/guild_floor_basalt", "2,6": "adventure_guild/guild_floor_basalt", "2,7": "adventure_guild/guild_floor_basalt", "2,8": "adventure_guild/guild_floor_basalt", "2,9": "adventure_guild/guild_floor_basalt", "3,0": "adventure_guild/guild_wall_cap_h::obstacle", "3,1": "adventure_guild/guild_wall_torch_face::obstacle", "3,2": "adventure_guild/guild_floor_basalt", "3,3": "adventure_guild/guild_floor_basalt", "3,4": "adventure_guild/guild_floor_basalt", "3,5": "adventure_guild/guild_floor_basalt", "3,6": "adventure_guild/guild_floor_basalt", "3,7": "adventure_guild/guild_floor_basalt", "3,8": "adventure_guild/guild_floor_basalt", "3,9": "adventure_guild/guild_floor_basalt", "4,0": "adventure_guild/guild_wall_cap_h::obstacle", "4,1": "adventure_guild/guild_wall_timber_face::obstacle", "4,2": "adventure_guild/guild_floor_basalt", "4,3": "adventure_guild/guild_floor_basalt", "4,4": "adventure_guild/guild_floor_basalt", "4,5": "adventure_guild/guild_floor_basalt", "4,6": "adventure_guild/guild_floor_basalt", "4,7": "adventure_guild/guild_floor_basalt", "4,8": "adventure_guild/guild_floor_basalt", "4,9": "adventure_guild/guild_floor_basalt", "5,0": "adventure_guild/guild_wall_cap_h::obstacle", "5,1": "adventure_guild/guild_wall_timber_face::obstacle", "5,2": "adventure_guild/guild_floor_basalt", "5,3": "adventure_guild/guild_floor_basalt", "5,4": "adventure_guild/guild_floor_basalt", "5,5": "adventure_guild/guild_floor_basalt", "5,6": "adventure_guild/guild_floor_basalt", "5,7": "adventure_guild/guild_floor_basalt", "5,8": "adventure_guild/guild_floor_basalt", "5,9": "adventure_guild/guild_floor_basalt", "6,0": "adventure_guild/guild_wall_cap_h::obstacle", "6,1": "adventure_guild/guild_wall_stained_glass::obstacle", "6,2": "adventure_guild/guild_floor_basalt", "6,3": "adventure_guild/guild_floor_basalt", "6,4": "adventure_guild/guild_floor_basalt", "6,5": "adventure_guild/guild_floor_basalt", "6,6": "adventure_guild/guild_floor_basalt", "6,7": "adventure_guild/guild_floor_basalt", "6,8": "adventure_guild/guild_floor_basalt", "6,9": "adventure_guild/guild_floor_basalt", "7,0": "adventure_guild/guild_wall_cap_h::obstacle", "7,1": "adventure_guild/guild_wall_timber_face::obstacle", "7,2": "adventure_guild/guild_floor_basalt", "7,3": "adventure_guild/guild_floor_basalt", "7,4": "adventure_guild/guild_floor_basalt", "7,5": "adventure_guild/guild_floor_basalt", "7,6": "adventure_guild/guild_floor_basalt", "7,7": "adventure_guild/guild_floor_basalt", "7,8": "adventure_guild/guild_floor_basalt", "7,9": "adventure_guild/guild_floor_basalt", "8,0": "adventure_guild/guild_wall_cap_h::obstacle", "8,1": "adventure_guild/guild_wall_timber_face::obstacle", "8,2": "adventure_guild/guild_floor_basalt", "8,3": "adventure_guild/guild_floor_basalt", "8,4": "adventure_guild/guild_floor_basalt", "8,5": "adventure_guild/guild_floor_basalt", "8,6": "adventure_guild/guild_floor_basalt", "8,7": "adventure_guild/guild_floor_basalt", "8,8": "adventure_guild/guild_floor_basalt", "8,9": "adventure_guild/guild_floor_basalt", "9,0": "adventure_guild/guild_wall_cap_h::obstacle", "9,1": "adventure_guild/guild_wall_torch_face::obstacle", "9,2": "adventure_guild/guild_floor_basalt", "9,3": "adventure_guild/guild_floor_basalt", "9,4": "adventure_guild/guild_floor_basalt", "9,5": "adventure_guild/guild_floor_basalt", "9,6": "adventure_guild/guild_floor_basalt", "9,7": "adventure_guild/guild_floor_basalt", "9,8": "adventure_guild/guild_floor_basalt", "9,9": "adventure_guild/guild_floor_basalt", "0,10": "grass_4", "0,11": "grass_4", "0,12": "grass_4", "0,13": "grass_4", "0,14": "grass_4", "0,15": "grass_4", "0,16": "grass_4", "0,17": "grass_4", "0,18": "grass_4", "0,19": "grass_4", "0,20": "grass_4", "0,21": "grass_4", "0,22": "grass_4", "0,23": "grass_4", "0,24": "grass_4", "0,25": "grass_4", "0,26": "grass_4", "0,27": "grass_4", "0,28": "grass_4", "0,29": "grass_4", "0,30": "grass_4", "0,31": "grass_4", "0,32": "grass_4", "0,33": "grass_4", "0,34": "grass_4", "0,35": "grass_4", "1,10": "adventure_guild/guild_wall_cap_v::obstacle", "1,11": "adventure_guild/guild_wall_cap_v::obstacle", "1,12": "adventure_guild/guild_wall_cap_v::obstacle", "1,13": "adventure_guild/guild_wall_cap_v::obstacle", "1,14": "adventure_guild/guild_wall_cap_v::obstacle", "1,15": "adventure_guild/guild_wall_cap_v::obstacle", "1,16": "adventure_guild/guild_wall_cap_v::obstacle", "1,17": "adventure_guild/guild_wall_cap_v::obstacle", "1,18": "adventure_guild/guild_wall_cap_v::obstacle", "1,19": "adventure_guild/guild_wall_cap_v::obstacle", "1,20": "adventure_guild/guild_wall_cap_v::obstacle", "1,21": "adventure_guild/guild_wall_cap_v::obstacle", "1,22": "adventure_guild/guild_wall_cap_v::obstacle", "1,23": "adventure_guild/guild_wall_cap_v::obstacle", "1,24": "adventure_guild/guild_wall_cap_v::obstacle", "1,25": "adventure_guild/guild_wall_cap_v::obstacle", "1,26": "adventure_guild/guild_wall_cap_v::obstacle", "1,27": "adventure_guild/guild_wall_cap_v::obstacle", "1,28": "adventure_guild/guild_wall_cap_v::obstacle", "1,29": "adventure_guild/guild_wall_cap_v::obstacle", "1,30": "adventure_guild/guild_wall_cap_v::obstacle", "1,31": "adventure_guild/guild_wall_cap_v::obstacle", "1,32": "grass_4", "1,33": "grass_4", "1,34": "grass_4", "1,35": "grass_4", "10,0": "adventure_guild/guild_wall_cap_h::obstacle", "10,1": "adventure_guild/guild_wall_timber_face::obstacle", "10,2": "adventure_guild/guild_floor_basalt", "10,3": "adventure_guild/guild_floor_basalt", "10,4": "adventure_guild/guild_floor_basalt", "10,5": "adventure_guild/guild_floor_basalt", "10,6": "adventure_guild/guild_floor_basalt", "10,7": "adventure_guild/guild_floor_basalt", "10,8": "adventure_guild/guild_floor_basalt", "10,9": "adventure_guild/guild_floor_basalt", "11,0": "adventure_guild/guild_wall_cap_h::obstacle", "11,1": "adventure_guild/guild_wall_timber_face::obstacle", "11,2": "adventure_guild/guild_floor_basalt", "11,3": "adventure_guild/guild_floor_basalt", "11,4": "adventure_guild/guild_floor_basalt", "11,5": "adventure_guild/guild_floor_basalt", "11,6": "adventure_guild/guild_floor_basalt", "11,7": "adventure_guild/guild_floor_basalt", "11,8": "adventure_guild/guild_floor_basalt", "11,9": "adventure_guild/guild_floor_basalt", "12,0": "adventure_guild/guild_wall_cap_h::obstacle", "12,1": "adventure_guild/guild_wall_stained_glass::obstacle", "12,2": "adventure_guild/guild_floor_basalt", "12,3": "adventure_guild/guild_floor_basalt", "12,4": "adventure_guild/guild_floor_basalt", "12,5": "adventure_guild/guild_floor_basalt", "12,6": "adventure_guild/guild_floor_basalt", "12,7": "adventure_guild/guild_floor_basalt", "12,8": "adventure_guild/guild_floor_basalt", "12,9": "adventure_guild/guild_floor_basalt", "13,0": "adventure_guild/guild_wall_cap_h::obstacle", "13,1": "adventure_guild/guild_wall_timber_face::obstacle", "13,2": "adventure_guild/guild_floor_basalt", "13,3": "adventure_guild/guild_floor_basalt", "13,4": "adventure_guild/guild_floor_basalt", "13,5": "adventure_guild/guild_floor_basalt", "13,6": "adventure_guild/guild_floor_basalt", "13,7": "adventure_guild/guild_floor_basalt", "13,8": "adventure_guild/guild_floor_basalt", "13,9": "adventure_guild/guild_floor_basalt", "14,0": "adventure_guild/guild_wall_cap_h::obstacle", "14,1": "adventure_guild/guild_wall_timber_face::obstacle", "14,2": "adventure_guild/guild_floor_basalt", "14,3": "adventure_guild/guild_floor_basalt", "14,4": "adventure_guild/guild_floor_basalt", "14,5": "adventure_guild/guild_floor_basalt", "14,6": "adventure_guild/guild_floor_basalt", "14,7": "adventure_guild/guild_floor_basalt", "14,8": "adventure_guild/guild_floor_basalt", "14,9": "adventure_guild/guild_floor_basalt", "15,0": "adventure_guild/guild_wall_cap_h::obstacle", "15,1": "adventure_guild/guild_wall_torch_face::obstacle", "15,2": "adventure_guild/guild_floor_basalt", "15,3": "adventure_guild/guild_floor_basalt", "15,4": "adventure_guild/guild_floor_basalt", "15,5": "adventure_guild/guild_floor_basalt", "15,6": "adventure_guild/guild_floor_basalt", "15,7": "adventure_guild/guild_floor_basalt", "15,8": "adventure_guild/guild_floor_basalt", "15,9": "adventure_guild/guild_floor_basalt", "16,0": "adventure_guild/guild_wall_cap_h::obstacle", "16,1": "adventure_guild/guild_wall_timber_face::obstacle", "16,2": "adventure_guild/guild_floor_basalt", "16,3": "adventure_guild/guild_floor_basalt", "16,4": "adventure_guild/guild_floor_basalt", "16,5": "adventure_guild/guild_floor_basalt", "16,6": "adventure_guild/guild_floor_basalt", "16,7": "adventure_guild/guild_floor_basalt", "16,8": "adventure_guild/guild_floor_basalt", "16,9": "adventure_guild/guild_floor_basalt", "17,0": "adventure_guild/guild_wall_cap_h::obstacle", "17,1": "adventure_guild/guild_wall_timber_face::obstacle", "17,2": "adventure_guild/guild_floor_basalt", "17,3": "adventure_guild/guild_floor_basalt", "17,4": "adventure_guild/guild_floor_basalt", "17,5": "adventure_guild/guild_floor_basalt", "17,6": "adventure_guild/guild_floor_basalt", "17,7": "adventure_guild/guild_floor_basalt", "17,8": "adventure_guild/guild_floor_basalt", "17,9": "adventure_guild/guild_floor_basalt", "18,0": "adventure_guild/guild_wall_cap_h::obstacle", "18,1": "adventure_guild/guild_wall_cap_v::obstacle", "18,2": "adventure_guild/guild_wall_cap_v::obstacle", "18,3": "adventure_guild/guild_wall_cap_v::obstacle", "18,4": "adventure_guild/guild_wall_cap_v::obstacle", "18,5": "adventure_guild/guild_wall_cap_v::obstacle", "18,6": "adventure_guild/guild_wall_cap_v::obstacle", "18,7": "adventure_guild/guild_wall_cap_v::obstacle", "18,8": "adventure_guild/guild_wall_cap_v::obstacle", "18,9": "adventure_guild/guild_wall_cap_v::obstacle", "19,0": "adventure_guild/guild_wall_cap_h::obstacle", "19,1": "adventure_guild/guild_wall_timber_face::obstacle", "19,2": "adventure_guild/guild_floor_arena", "19,3": "adventure_guild/guild_floor_arena", "19,4": "adventure_guild/guild_floor_arena", "19,5": "adventure_guild/guild_floor_arena", "19,6": "adventure_guild/guild_floor_arena", "19,7": "adventure_guild/guild_floor_arena", "19,8": "adventure_guild/guild_floor_arena", "19,9": "adventure_guild/guild_floor_arena", "2,10": "adventure_guild/guild_floor_basalt", "2,11": "adventure_guild/guild_floor_basalt", "2,12": "adventure_guild/guild_floor_basalt", "2,13": "adventure_guild/guild_floor_basalt", "2,14": "adventure_guild/guild_floor_basalt", "2,15": "adventure_guild/guild_wall_timber_face::obstacle", "2,16": "adventure_guild/guild_floor_flagstone", "2,17": "adventure_guild/guild_floor_flagstone", "2,18": "adventure_guild/guild_floor_flagstone", "2,19": "adventure_guild/guild_floor_flagstone", "2,20": "adventure_guild/guild_floor_flagstone", "2,21": "adventure_guild/guild_floor_flagstone", "2,22": "adventure_guild/guild_floor_flagstone", "2,23": "adventure_guild/guild_floor_flagstone", "2,24": "adventure_guild/guild_floor_flagstone", "2,25": "adventure_guild/guild_floor_flagstone", "2,26": "adventure_guild/guild_floor_flagstone", "2,27": "adventure_guild/guild_floor_flagstone", "2,28": "adventure_guild/guild_floor_flagstone", "2,29": "adventure_guild/guild_floor_flagstone", "2,30": "adventure_guild/guild_wall_cap_h::obstacle", "2,31": "adventure_guild/guild_wall_timber_face::obstacle", "2,32": "grass_4", "2,33": "grass_4", "2,34": "grass_4", "2,35": "grass_4", "20,0": "adventure_guild/guild_wall_cap_h::obstacle", "20,1": "adventure_guild/guild_wall_torch_face::obstacle", "20,2": "adventure_guild/guild_floor_arena", "20,3": "adventure_guild/guild_floor_arena", "20,4": "adventure_guild/guild_floor_arena", "20,5": "adventure_guild/guild_floor_arena", "20,6": "adventure_guild/guild_floor_arena", "20,7": "adventure_guild/guild_floor_arena", "20,8": "adventure_guild/guild_floor_arena", "20,9": "adventure_guild/guild_floor_arena", "21,0": "adventure_guild/guild_wall_cap_h::obstacle", "21,1": "adventure_guild/guild_wall_timber_face::obstacle", "21,2": "adventure_guild/guild_floor_arena", "21,3": "adventure_guild/guild_floor_arena", "21,4": "adventure_guild/guild_floor_arena", "21,5": "adventure_guild/guild_floor_arena", "21,6": "adventure_guild/guild_floor_arena", "21,7": "adventure_guild/guild_floor_arena", "21,8": "adventure_guild/guild_floor_arena", "21,9": "adventure_guild/guild_floor_arena", "22,0": "adventure_guild/guild_wall_cap_h::obstacle", "22,1": "adventure_guild/guild_wall_timber_face::obstacle", "22,2": "adventure_guild/guild_floor_arena", "22,3": "adventure_guild/guild_floor_arena", "22,4": "adventure_guild/guild_floor_arena", "22,5": "adventure_guild/guild_floor_arena", "22,6": "adventure_guild/guild_floor_arena", "22,7": "adventure_guild/guild_floor_arena", "22,8": "adventure_guild/guild_floor_arena", "22,9": "adventure_guild/guild_floor_arena", "23,0": "adventure_guild/guild_wall_cap_h::obstacle", "23,1": "adventure_guild/guild_wall_stained_glass::obstacle", "23,2": "adventure_guild/guild_floor_arena", "23,3": "adventure_guild/guild_floor_arena", "23,4": "adventure_guild/guild_floor_arena", "23,5": "adventure_guild/guild_floor_arena", "23,6": "adventure_guild/guild_floor_arena", "23,7": "adventure_guild/guild_floor_arena", "23,8": "adventure_guild/guild_floor_arena", "23,9": "adventure_guild/guild_floor_arena", "24,0": "adventure_guild/guild_wall_cap_h::obstacle", "24,1": "adventure_guild/guild_wall_timber_face::obstacle", "24,2": "adventure_guild/guild_floor_arena", "24,3": "adventure_guild/guild_floor_arena", "24,4": "adventure_guild/guild_floor_arena", "24,5": "adventure_guild/guild_floor_arena", "24,6": "adventure_guild/guild_floor_arena", "24,7": "adventure_guild/guild_floor_arena", "24,8": "adventure_guild/guild_floor_arena", "24,9": "adventure_guild/guild_floor_arena", "25,0": "adventure_guild/guild_wall_cap_h::obstacle", "25,1": "adventure_guild/guild_wall_timber_face::obstacle", "25,2": "adventure_guild/guild_floor_arena", "25,3": "adventure_guild/guild_floor_arena", "25,4": "adventure_guild/guild_floor_arena", "25,5": "adventure_guild/guild_floor_arena", "25,6": "adventure_guild/guild_floor_arena", "25,7": "adventure_guild/guild_floor_arena", "25,8": "adventure_guild/guild_floor_arena", "25,9": "adventure_guild/guild_floor_arena", "26,0": "adventure_guild/guild_wall_cap_h::obstacle", "26,1": "adventure_guild/guild_wall_torch_face::obstacle", "26,2": "adventure_guild/guild_floor_arena", "26,3": "adventure_guild/guild_floor_arena", "26,4": "adventure_guild/guild_floor_arena", "26,5": "adventure_guild/guild_floor_arena", "26,6": "adventure_guild/guild_floor_arena", "26,7": "adventure_guild/guild_floor_arena", "26,8": "adventure_guild/guild_floor_arena", "26,9": "adventure_guild/guild_floor_arena", "27,0": "adventure_guild/guild_wall_cap_h::obstacle", "27,1": "adventure_guild/guild_wall_timber_face::obstacle", "27,2": "adventure_guild/guild_floor_arena", "27,3": "adventure_guild/guild_floor_arena", "27,4": "adventure_guild/guild_floor_arena", "27,5": "adventure_guild/guild_floor_arena", "27,6": "adventure_guild/guild_floor_arena", "27,7": "adventure_guild/guild_floor_arena", "27,8": "adventure_guild/guild_floor_arena", "27,9": "adventure_guild/guild_floor_arena", "28,0": "adventure_guild/guild_wall_cap_h::obstacle", "28,1": "adventure_guild/guild_wall_stained_glass::obstacle", "28,2": "adventure_guild/guild_floor_arena", "28,3": "adventure_guild/guild_floor_arena", "28,4": "adventure_guild/guild_floor_arena", "28,5": "adventure_guild/guild_floor_arena", "28,6": "adventure_guild/guild_floor_arena", "28,7": "adventure_guild/guild_floor_arena", "28,8": "adventure_guild/guild_floor_arena", "28,9": "adventure_guild/guild_floor_arena", "29,0": "adventure_guild/guild_wall_cap_h::obstacle", "29,1": "adventure_guild/guild_wall_timber_face::obstacle", "29,2": "adventure_guild/guild_floor_arena", "29,3": "adventure_guild/guild_floor_arena", "29,4": "adventure_guild/guild_floor_arena", "29,5": "adventure_guild/guild_floor_arena", "29,6": "adventure_guild/guild_floor_arena", "29,7": "adventure_guild/guild_floor_arena", "29,8": "adventure_guild/guild_floor_arena", "29,9": "adventure_guild/guild_floor_arena", "3,10": "adventure_guild/guild_floor_basalt", "3,11": "adventure_guild/guild_floor_basalt", "3,12": "adventure_guild/guild_floor_basalt", "3,13": "adventure_guild/guild_floor_basalt", "3,14": "adventure_guild/guild_floor_basalt", "3,15": "adventure_guild/guild_wall_torch_face::obstacle", "3,16": "adventure_guild/guild_floor_flagstone", "3,17": "adventure_guild/guild_floor_flagstone", "3,18": "adventure_guild/guild_floor_flagstone", "3,19": "adventure_guild/guild_floor_flagstone", "3,20": "adventure_guild/guild_floor_flagstone", "3,21": "adventure_guild/guild_floor_flagstone", "3,22": "adventure_guild/guild_floor_flagstone", "3,23": "adventure_guild/guild_floor_flagstone", "3,24": "adventure_guild/guild_floor_flagstone", "3,25": "adventure_guild/guild_floor_flagstone", "3,26": "adventure_guild/guild_floor_flagstone", "3,27": "adventure_guild/guild_floor_flagstone", "3,28": "adventure_guild/guild_floor_flagstone", "3,29": "adventure_guild/guild_floor_flagstone", "3,30": "adventure_guild/guild_wall_cap_h::obstacle", "3,31": "adventure_guild/guild_wall_torch_face::obstacle", "3,32": "grass_4", "3,33": "grass_4", "3,34": "grass_4", "3,35": "grass_4", "30,0": "adventure_guild/guild_wall_cap_h::obstacle", "30,1": "adventure_guild/guild_wall_timber_face::obstacle", "30,2": "adventure_guild/guild_floor_arena", "30,3": "adventure_guild/guild_floor_arena", "30,4": "adventure_guild/guild_floor_arena", "30,5": "adventure_guild/guild_floor_arena", "30,6": "adventure_guild/guild_floor_arena", "30,7": "adventure_guild/guild_floor_arena", "30,8": "adventure_guild/guild_floor_arena", "30,9": "adventure_guild/guild_floor_arena", "31,0": "adventure_guild/guild_wall_cap_h::obstacle", "31,1": "adventure_guild/guild_wall_cap_v::obstacle", "31,2": "adventure_guild/guild_wall_cap_v::obstacle", "31,3": "adventure_guild/guild_wall_cap_v::obstacle", "31,4": "adventure_guild/guild_wall_cap_v::obstacle", "31,5": "adventure_guild/guild_wall_cap_v::obstacle", "31,6": "adventure_guild/guild_wall_cap_v::obstacle", "31,7": "adventure_guild/guild_wall_cap_v::obstacle", "31,8": "adventure_guild/guild_wall_cap_v::obstacle", "31,9": "adventure_guild/guild_wall_end_s::obstacle", "32,0": "adventure_guild/guild_wall_cap_h::obstacle", "32,1": "adventure_guild/guild_wall_timber_face::obstacle", "32,2": "adventure_guild/guild_floor_sanctum", "32,3": "adventure_guild/guild_floor_sanctum", "32,4": "adventure_guild/guild_floor_sanctum", "32,5": "adventure_guild/guild_floor_sanctum", "32,6": "adventure_guild/guild_floor_sanctum", "32,7": "adventure_guild/guild_floor_sanctum", "32,8": "adventure_guild/guild_floor_sanctum", "32,9": "adventure_guild/guild_floor_sanctum", "33,0": "adventure_guild/guild_wall_cap_h::obstacle", "33,1": "adventure_guild/guild_wall_torch_face::obstacle", "33,2": "adventure_guild/guild_floor_sanctum", "33,3": "adventure_guild/guild_floor_sanctum", "33,4": "adventure_guild/guild_floor_sanctum", "33,5": "adventure_guild/guild_floor_sanctum", "33,6": "adventure_guild/guild_floor_sanctum", "33,7": "adventure_guild/guild_floor_sanctum", "33,8": "adventure_guild/guild_floor_sanctum", "33,9": "adventure_guild/guild_floor_sanctum", "34,0": "adventure_guild/guild_wall_cap_h::obstacle", "34,1": "adventure_guild/guild_wall_stained_glass::obstacle", "34,2": "adventure_guild/guild_floor_sanctum", "34,3": "adventure_guild/guild_floor_sanctum", "34,4": "adventure_guild/guild_floor_sanctum", "34,5": "adventure_guild/guild_floor_sanctum", "34,6": "adventure_guild/guild_floor_sanctum", "34,7": "adventure_guild/guild_floor_sanctum", "34,8": "adventure_guild/guild_floor_sanctum", "34,9": "adventure_guild/guild_floor_sanctum", "35,0": "adventure_guild/guild_wall_cap_h::obstacle", "35,1": "adventure_guild/guild_wall_timber_face::obstacle", "35,2": "adventure_guild/guild_floor_sanctum", "35,3": "adventure_guild/guild_floor_sanctum", "35,4": "adventure_guild/guild_floor_sanctum", "35,5": "adventure_guild/guild_floor_sanctum", "35,6": "adventure_guild/guild_floor_sanctum", "35,7": "adventure_guild/guild_floor_sanctum", "35,8": "adventure_guild/guild_floor_sanctum", "35,9": "adventure_guild/guild_floor_sanctum", "36,0": "adventure_guild/guild_wall_end_r::obstacle", "36,1": "adventure_guild/guild_wall_timber_face::obstacle", "36,2": "adventure_guild/guild_floor_sanctum", "36,3": "adventure_guild/guild_floor_sanctum", "36,4": "adventure_guild/guild_floor_sanctum", "36,5": "adventure_guild/guild_floor_sanctum", "36,6": "adventure_guild/guild_floor_sanctum", "36,7": "adventure_guild/guild_floor_sanctum", "36,8": "adventure_guild/guild_floor_sanctum", "36,9": "adventure_guild/guild_floor_sanctum", "37,0": "adventure_guild/guild_floor_sanctum", "37,1": "adventure_guild/guild_floor_sanctum", "37,2": "adventure_guild/guild_floor_sanctum", "37,3": "adventure_guild/guild_floor_sanctum", "37,4": "adventure_guild/guild_floor_sanctum", "37,5": "adventure_guild/guild_floor_sanctum", "37,6": "adventure_guild/guild_floor_sanctum", "37,7": "adventure_guild/guild_floor_sanctum", "37,8": "adventure_guild/guild_floor_sanctum", "37,9": "adventure_guild/guild_floor_sanctum", "38,0": "adventure_guild/guild_floor_sanctum", "38,1": "adventure_guild/guild_floor_sanctum", "38,2": "adventure_guild/guild_floor_sanctum", "38,3": "adventure_guild/guild_floor_sanctum", "38,4": "adventure_guild/guild_floor_sanctum", "38,5": "adventure_guild/guild_floor_sanctum", "38,6": "adventure_guild/guild_floor_sanctum", "38,7": "adventure_guild/guild_floor_sanctum", "38,8": "adventure_guild/guild_floor_sanctum", "38,9": "adventure_guild/guild_floor_sanctum", "39,0": "adventure_guild/guild_floor_sanctum", "39,1": "adventure_guild/guild_floor_sanctum", "39,2": "adventure_guild/guild_floor_sanctum", "39,3": "adventure_guild/guild_floor_sanctum", "39,4": "adventure_guild/guild_floor_sanctum", "39,5": "adventure_guild/guild_floor_sanctum", "39,6": "adventure_guild/guild_floor_sanctum", "39,7": "adventure_guild/guild_floor_sanctum", "39,8": "adventure_guild/guild_floor_sanctum", "39,9": "adventure_guild/guild_floor_sanctum", "4,10": "adventure_guild/guild_floor_basalt", "4,11": "adventure_guild/guild_floor_basalt", "4,12": "adventure_guild/guild_floor_basalt", "4,13": "adventure_guild/guild_floor_basalt", "4,14": "adventure_guild/guild_floor_basalt", "4,15": "adventure_guild/guild_wall_timber_face::obstacle", "4,16": "adventure_guild/guild_floor_flagstone", "4,17": "adventure_guild/guild_floor_flagstone", "4,18": "adventure_guild/guild_floor_flagstone", "4,19": "adventure_guild/guild_floor_flagstone", "4,20": "adventure_guild/guild_floor_flagstone", "4,21": "adventure_guild/guild_floor_flagstone", "4,22": "adventure_guild/guild_floor_flagstone", "4,23": "adventure_guild/guild_floor_flagstone", "4,24": "adventure_guild/guild_floor_flagstone", "4,25": "adventure_guild/guild_floor_flagstone", "4,26": "adventure_guild/guild_floor_flagstone", "4,27": "adventure_guild/guild_floor_flagstone", "4,28": "adventure_guild/guild_floor_flagstone", "4,29": "adventure_guild/guild_floor_flagstone", "4,30": "adventure_guild/guild_wall_cap_h::obstacle", "4,31": "adventure_guild/guild_wall_timber_face::obstacle", "4,32": "grass_4", "4,33": "grass_4", "4,34": "grass_4", "4,35": "grass_4", "40,0": "adventure_guild/guild_floor_sanctum", "40,1": "adventure_guild/guild_floor_sanctum", "40,2": "adventure_guild/guild_floor_sanctum", "40,3": "adventure_guild/guild_floor_sanctum", "40,4": "adventure_guild/guild_floor_sanctum", "40,5": "adventure_guild/guild_floor_sanctum", "40,6": "adventure_guild/guild_floor_sanctum", "40,7": "adventure_guild/guild_floor_sanctum", "40,8": "adventure_guild/guild_floor_sanctum", "40,9": "adventure_guild/guild_floor_sanctum", "41,0": "adventure_guild/guild_wall_end_l::obstacle", "41,1": "adventure_guild/guild_wall_torch_face::obstacle", "41,2": "adventure_guild/guild_floor_sanctum", "41,3": "adventure_guild/guild_floor_sanctum", "41,4": "adventure_guild/guild_floor_sanctum", "41,5": "adventure_guild/guild_floor_sanctum", "41,6": "adventure_guild/guild_floor_sanctum", "41,7": "adventure_guild/guild_floor_sanctum", "41,8": "adventure_guild/guild_floor_sanctum", "41,9": "adventure_guild/guild_floor_sanctum", "42,0": "adventure_guild/guild_wall_cap_h::obstacle", "42,1": "adventure_guild/guild_wall_timber_face::obstacle", "42,2": "adventure_guild/guild_floor_sanctum", "42,3": "adventure_guild/guild_floor_sanctum", "42,4": "adventure_guild/guild_floor_sanctum", "42,5": "adventure_guild/guild_floor_sanctum", "42,6": "adventure_guild/guild_floor_sanctum", "42,7": "adventure_guild/guild_floor_sanctum", "42,8": "adventure_guild/guild_floor_sanctum", "42,9": "adventure_guild/guild_floor_sanctum", "43,0": "adventure_guild/guild_wall_cap_h::obstacle", "43,1": "adventure_guild/guild_wall_stained_glass::obstacle", "43,2": "adventure_guild/guild_floor_sanctum", "43,3": "adventure_guild/guild_floor_sanctum", "43,4": "adventure_guild/guild_floor_sanctum", "43,5": "adventure_guild/guild_floor_sanctum", "43,6": "adventure_guild/guild_floor_sanctum", "43,7": "adventure_guild/guild_floor_sanctum", "43,8": "adventure_guild/guild_floor_sanctum", "43,9": "adventure_guild/guild_floor_sanctum", "44,0": "adventure_guild/guild_wall_cap_h::obstacle", "44,1": "adventure_guild/guild_wall_timber_face::obstacle", "44,2": "adventure_guild/guild_floor_sanctum", "44,3": "adventure_guild/guild_floor_sanctum", "44,4": "adventure_guild/guild_floor_sanctum", "44,5": "adventure_guild/guild_floor_sanctum", "44,6": "adventure_guild/guild_floor_sanctum", "44,7": "adventure_guild/guild_floor_sanctum", "44,8": "adventure_guild/guild_floor_sanctum", "44,9": "adventure_guild/guild_floor_sanctum", "45,0": "adventure_guild/guild_wall_cap_h::obstacle", "45,1": "adventure_guild/guild_wall_timber_face::obstacle", "45,2": "adventure_guild/guild_floor_sanctum", "45,3": "adventure_guild/guild_floor_sanctum", "45,4": "adventure_guild/guild_floor_sanctum", "45,5": "adventure_guild/guild_floor_sanctum", "45,6": "adventure_guild/guild_floor_sanctum", "45,7": "adventure_guild/guild_floor_sanctum", "45,8": "adventure_guild/guild_floor_sanctum", "45,9": "adventure_guild/guild_floor_sanctum", "46,0": "adventure_guild/guild_wall_corner_ne::obstacle", "46,1": "adventure_guild/guild_wall_cap_v::obstacle", "46,2": "adventure_guild/guild_wall_cap_v::obstacle", "46,3": "adventure_guild/guild_wall_cap_v::obstacle", "46,4": "adventure_guild/guild_wall_cap_v::obstacle", "46,5": "adventure_guild/guild_wall_cap_v::obstacle", "46,6": "adventure_guild/guild_wall_cap_v::obstacle", "46,7": "adventure_guild/guild_wall_cap_v::obstacle", "46,8": "adventure_guild/guild_wall_cap_v::obstacle", "46,9": "adventure_guild/guild_wall_cap_v::obstacle", "47,0": "grass_4", "47,1": "grass_4", "47,2": "grass_4", "47,3": "grass_4", "47,4": "grass_4", "47,5": "grass_4", "47,6": "grass_4", "47,7": "grass_4", "47,8": "grass_4", "47,9": "grass_4", "5,10": "adventure_guild/guild_floor_basalt", "5,11": "adventure_guild/guild_floor_basalt", "5,12": "adventure_guild/guild_floor_basalt", "5,13": "adventure_guild/guild_floor_basalt", "5,14": "adventure_guild/guild_floor_basalt", "5,15": "adventure_guild/guild_wall_stained_glass::obstacle", "5,16": "adventure_guild/guild_floor_flagstone", "5,17": "adventure_guild/guild_floor_flagstone", "5,18": "adventure_guild/guild_floor_flagstone", "5,19": "adventure_guild/guild_floor_flagstone", "5,20": "adventure_guild/guild_floor_flagstone", "5,21": "adventure_guild/guild_floor_flagstone", "5,22": "adventure_guild/guild_floor_flagstone", "5,23": "adventure_guild/guild_floor_flagstone", "5,24": "adventure_guild/guild_floor_flagstone", "5,25": "adventure_guild/guild_floor_flagstone", "5,26": "adventure_guild/guild_floor_flagstone", "5,27": "adventure_guild/guild_floor_flagstone", "5,28": "adventure_guild/guild_floor_flagstone", "5,29": "adventure_guild/guild_floor_flagstone", "5,30": "adventure_guild/guild_wall_cap_h::obstacle", "5,31": "adventure_guild/guild_wall_stained_glass::obstacle", "5,32": "grass_4", "5,33": "grass_4", "5,34": "grass_4", "5,35": "grass_4", "6,10": "adventure_guild/guild_floor_basalt", "6,11": "adventure_guild/guild_floor_basalt", "6,12": "adventure_guild/guild_floor_basalt", "6,13": "adventure_guild/guild_floor_basalt", "6,14": "adventure_guild/guild_floor_basalt", "6,15": "adventure_guild/guild_wall_timber_face::obstacle", "6,16": "adventure_guild/guild_floor_flagstone", "6,17": "adventure_guild/guild_floor_flagstone", "6,18": "adventure_guild/guild_floor_flagstone", "6,19": "adventure_guild/guild_floor_flagstone", "6,20": "adventure_guild/guild_floor_flagstone", "6,21": "adventure_guild/guild_floor_flagstone", "6,22": "adventure_guild/guild_floor_flagstone", "6,23": "adventure_guild/guild_floor_flagstone", "6,24": "adventure_guild/guild_floor_flagstone", "6,25": "adventure_guild/guild_floor_flagstone", "6,26": "adventure_guild/guild_floor_flagstone", "6,27": "adventure_guild/guild_floor_flagstone", "6,28": "adventure_guild/guild_floor_flagstone", "6,29": "adventure_guild/guild_floor_flagstone", "6,30": "adventure_guild/guild_wall_cap_h::obstacle", "6,31": "adventure_guild/guild_wall_timber_face::obstacle", "6,32": "grass_4", "6,33": "grass_4", "6,34": "grass_4", "6,35": "grass_4", "7,10": "adventure_guild/guild_floor_basalt", "7,11": "adventure_guild/guild_floor_basalt", "7,12": "adventure_guild/guild_floor_basalt", "7,13": "adventure_guild/guild_floor_basalt", "7,14": "adventure_guild/guild_floor_basalt", "7,15": "adventure_guild/guild_wall_timber_face::obstacle", "7,16": "adventure_guild/guild_floor_flagstone", "7,17": "adventure_guild/guild_floor_flagstone", "7,18": "adventure_guild/guild_floor_flagstone", "7,19": "adventure_guild/guild_floor_flagstone", "7,20": "adventure_guild/guild_floor_flagstone", "7,21": "adventure_guild/guild_floor_flagstone", "7,22": "adventure_guild/guild_floor_flagstone", "7,23": "adventure_guild/guild_floor_flagstone", "7,24": "adventure_guild/guild_floor_flagstone", "7,25": "adventure_guild/guild_floor_flagstone", "7,26": "adventure_guild/guild_floor_flagstone", "7,27": "adventure_guild/guild_floor_flagstone", "7,28": "adventure_guild/guild_floor_flagstone", "7,29": "adventure_guild/guild_floor_flagstone", "7,30": "adventure_guild/guild_wall_cap_h::obstacle", "7,31": "adventure_guild/guild_wall_timber_face::obstacle", "7,32": "grass_4", "7,33": "grass_4", "7,34": "grass_4", "7,35": "grass_4", "8,10": "adventure_guild/guild_floor_basalt", "8,11": "adventure_guild/guild_floor_basalt", "8,12": "adventure_guild/guild_floor_basalt", "8,13": "adventure_guild/guild_floor_basalt", "8,14": "adventure_guild/guild_floor_basalt", "8,15": "adventure_guild/guild_wall_stained_glass::obstacle", "8,16": "adventure_guild/guild_floor_flagstone", "8,17": "adventure_guild/guild_floor_flagstone", "8,18": "adventure_guild/guild_floor_flagstone", "8,19": "adventure_guild/guild_floor_flagstone", "8,20": "adventure_guild/guild_floor_flagstone", "8,21": "adventure_guild/guild_floor_flagstone", "8,22": "adventure_guild/guild_floor_flagstone", "8,23": "adventure_guild/guild_floor_flagstone", "8,24": "adventure_guild/guild_floor_flagstone", "8,25": "adventure_guild/guild_floor_flagstone", "8,26": "adventure_guild/guild_floor_flagstone", "8,27": "adventure_guild/guild_floor_flagstone", "8,28": "adventure_guild/guild_floor_flagstone", "8,29": "adventure_guild/guild_floor_flagstone", "8,30": "adventure_guild/guild_wall_cap_h::obstacle", "8,31": "adventure_guild/guild_wall_timber_face::obstacle", "8,32": "grass_4", "8,33": "grass_4", "8,34": "grass_4", "8,35": "grass_4", "9,10": "adventure_guild/guild_floor_basalt", "9,11": "adventure_guild/guild_floor_basalt", "9,12": "adventure_guild/guild_floor_basalt", "9,13": "adventure_guild/guild_floor_basalt", "9,14": "adventure_guild/guild_floor_basalt", "9,15": "adventure_guild/guild_wall_timber_face::obstacle", "9,16": "adventure_guild/guild_floor_flagstone", "9,17": "adventure_guild/guild_floor_flagstone", "9,18": "adventure_guild/guild_floor_flagstone", "9,19": "adventure_guild/guild_floor_flagstone", "9,20": "adventure_guild/guild_floor_flagstone", "9,21": "adventure_guild/guild_floor_flagstone", "9,22": "adventure_guild/guild_floor_flagstone", "9,23": "adventure_guild/guild_floor_flagstone", "9,24": "adventure_guild/guild_floor_flagstone", "9,25": "adventure_guild/guild_floor_flagstone", "9,26": "adventure_guild/guild_floor_flagstone", "9,27": "adventure_guild/guild_floor_flagstone", "9,28": "adventure_guild/guild_floor_flagstone", "9,29": "adventure_guild/guild_floor_flagstone", "9,30": "adventure_guild/guild_wall_cap_h::obstacle", "9,31": "adventure_guild/guild_wall_stained_glass::obstacle", "9,32": "grass_4", "9,33": "grass_4", "9,34": "grass_4", "9,35": "grass_4", "10,10": "adventure_guild/guild_floor_basalt", "10,11": "adventure_guild/guild_floor_basalt", "10,12": "adventure_guild/guild_floor_basalt", "10,13": "adventure_guild/guild_floor_basalt", "10,14": "adventure_guild/guild_floor_basalt", "10,15": "adventure_guild/guild_wall_torch_face::obstacle", "10,16": "adventure_guild/guild_floor_flagstone", "10,17": "adventure_guild/guild_floor_flagstone", "10,18": "adventure_guild/guild_floor_flagstone", "10,19": "adventure_guild/guild_floor_flagstone", "10,20": "adventure_guild/guild_floor_flagstone", "10,21": "adventure_guild/guild_floor_flagstone", "10,22": "adventure_guild/guild_floor_flagstone", "10,23": "adventure_guild/guild_floor_flagstone", "10,24": "adventure_guild/guild_floor_flagstone", "10,25": "adventure_guild/guild_floor_flagstone", "10,26": "adventure_guild/guild_floor_flagstone", "10,27": "adventure_guild/guild_floor_flagstone", "10,28": "adventure_guild/guild_floor_flagstone", "10,29": "adventure_guild/guild_floor_flagstone", "10,30": "adventure_guild/guild_wall_cap_h::obstacle", "10,31": "adventure_guild/guild_wall_timber_face::obstacle", "10,32": "adventure_guild/guild_floor_cobble", "10,33": "grass_4", "10,34": "grass_4", "10,35": "grass_4", "11,10": "adventure_guild/guild_floor_basalt", "11,11": "adventure_guild/guild_floor_basalt", "11,12": "adventure_guild/guild_floor_basalt", "11,13": "adventure_guild/guild_floor_basalt", "11,14": "adventure_guild/guild_floor_basalt", "11,15": "adventure_guild/guild_floor_flagstone", "11,16": "adventure_guild/guild_floor_flagstone", "11,17": "adventure_guild/guild_floor_flagstone", "11,18": "adventure_guild/guild_floor_flagstone", "11,19": "adventure_guild/guild_floor_flagstone", "11,20": "adventure_guild/guild_floor_flagstone", "11,21": "adventure_guild/guild_floor_flagstone", "11,22": "adventure_guild/guild_floor_flagstone", "11,23": "adventure_guild/guild_floor_flagstone", "11,24": "adventure_guild/guild_floor_flagstone", "11,25": "adventure_guild/guild_floor_flagstone", "11,26": "adventure_guild/guild_floor_flagstone", "11,27": "adventure_guild/guild_floor_flagstone", "11,28": "adventure_guild/guild_floor_flagstone", "11,29": "adventure_guild/guild_floor_flagstone", "11,30": "adventure_guild/guild_wall_cap_h::obstacle", "11,31": "adventure_guild/guild_wall_timber_face::obstacle", "11,32": "adventure_guild/guild_floor_cobble", "11,33": "grass_4", "11,34": "grass_4", "11,35": "grass_4", "12,10": "adventure_guild/guild_floor_basalt", "12,11": "adventure_guild/guild_floor_basalt", "12,12": "adventure_guild/guild_floor_basalt", "12,13": "adventure_guild/guild_floor_basalt", "12,14": "adventure_guild/guild_floor_basalt", "12,15": "adventure_guild/guild_floor_flagstone", "12,16": "adventure_guild/guild_floor_flagstone", "12,17": "adventure_guild/guild_floor_flagstone", "12,18": "adventure_guild/guild_floor_flagstone", "12,19": "adventure_guild/guild_floor_flagstone", "12,20": "adventure_guild/guild_floor_flagstone", "12,21": "adventure_guild/guild_floor_flagstone", "12,22": "adventure_guild/guild_floor_flagstone", "12,23": "adventure_guild/guild_floor_flagstone", "12,24": "adventure_guild/guild_floor_flagstone", "12,25": "adventure_guild/guild_floor_flagstone", "12,26": "adventure_guild/guild_floor_flagstone", "12,27": "adventure_guild/guild_floor_flagstone", "12,28": "adventure_guild/guild_floor_flagstone", "12,29": "adventure_guild/guild_floor_flagstone", "12,30": "adventure_guild/guild_wall_cap_h::obstacle", "12,31": "adventure_guild/guild_wall_timber_face::obstacle", "12,32": "adventure_guild/guild_floor_cobble", "12,33": "grass_4", "12,34": "grass_4", "12,35": "grass_4", "13,10": "adventure_guild/guild_floor_basalt", "13,11": "adventure_guild/guild_floor_basalt", "13,12": "adventure_guild/guild_floor_basalt", "13,13": "adventure_guild/guild_floor_basalt", "13,14": "adventure_guild/guild_floor_basalt", "13,15": "adventure_guild/guild_floor_flagstone", "13,16": "adventure_guild/guild_floor_flagstone", "13,17": "adventure_guild/guild_floor_flagstone", "13,18": "adventure_guild/guild_floor_flagstone", "13,19": "adventure_guild/guild_floor_flagstone", "13,20": "adventure_guild/guild_floor_flagstone", "13,21": "adventure_guild/guild_floor_flagstone", "13,22": "adventure_guild/guild_floor_flagstone", "13,23": "adventure_guild/guild_floor_flagstone", "13,24": "adventure_guild/guild_floor_flagstone", "13,25": "adventure_guild/guild_floor_flagstone", "13,26": "adventure_guild/guild_floor_flagstone", "13,27": "adventure_guild/guild_floor_flagstone", "13,28": "adventure_guild/guild_floor_flagstone", "13,29": "adventure_guild/guild_floor_flagstone", "13,30": "adventure_guild/guild_wall_cap_h::obstacle", "13,31": "adventure_guild/guild_wall_stained_glass::obstacle", "13,32": "adventure_guild/guild_floor_cobble", "13,33": "grass_4", "13,34": "grass_4", "13,35": "grass_4", "14,10": "adventure_guild/guild_floor_basalt", "14,11": "adventure_guild/guild_floor_basalt", "14,12": "adventure_guild/guild_floor_basalt", "14,13": "adventure_guild/guild_floor_basalt", "14,14": "adventure_guild/guild_floor_basalt", "14,15": "adventure_guild/guild_floor_flagstone", "14,16": "adventure_guild/guild_floor_flagstone", "14,17": "adventure_guild/guild_floor_flagstone", "14,18": "adventure_guild/guild_floor_flagstone", "14,19": "adventure_guild/guild_floor_flagstone", "14,20": "adventure_guild/guild_floor_flagstone", "14,21": "adventure_guild/guild_floor_flagstone", "14,22": "adventure_guild/guild_floor_flagstone", "14,23": "adventure_guild/guild_floor_flagstone", "14,24": "adventure_guild/guild_floor_flagstone", "14,25": "adventure_guild/guild_floor_flagstone", "14,26": "adventure_guild/guild_floor_flagstone", "14,27": "adventure_guild/guild_floor_flagstone", "14,28": "adventure_guild/guild_floor_flagstone", "14,29": "adventure_guild/guild_floor_flagstone", "14,30": "adventure_guild/guild_wall_cap_h::obstacle", "14,31": "adventure_guild/guild_wall_timber_face::obstacle", "14,32": "adventure_guild/guild_floor_cobble", "14,33": "adventure_guild/guild_floor_cobble", "14,34": "adventure_guild/guild_floor_cobble", "14,35": "adventure_guild/guild_floor_cobble", "15,10": "adventure_guild/guild_floor_basalt", "15,11": "adventure_guild/guild_floor_basalt", "15,12": "adventure_guild/guild_floor_basalt", "15,13": "adventure_guild/guild_floor_basalt", "15,14": "adventure_guild/guild_floor_basalt", "15,15": "adventure_guild/guild_wall_torch_face::obstacle", "15,16": "adventure_guild/guild_floor_flagstone", "15,17": "adventure_guild/guild_floor_flagstone", "15,18": "adventure_guild/guild_floor_flagstone", "15,19": "adventure_guild/guild_floor_flagstone", "15,20": "adventure_guild/guild_floor_flagstone", "15,21": "adventure_guild/guild_floor_flagstone", "15,22": "adventure_guild/guild_floor_flagstone", "15,23": "adventure_guild/guild_floor_flagstone", "15,24": "adventure_guild/guild_floor_flagstone", "15,25": "adventure_guild/guild_floor_flagstone", "15,26": "adventure_guild/guild_floor_flagstone", "15,27": "adventure_guild/guild_floor_flagstone", "15,28": "adventure_guild/guild_floor_flagstone", "15,29": "adventure_guild/guild_floor_flagstone", "15,30": "adventure_guild/guild_wall_cap_h::obstacle", "15,31": "adventure_guild/guild_wall_timber_face::obstacle", "15,32": "adventure_guild/guild_floor_cobble", "15,33": "adventure_guild/guild_floor_cobble", "15,34": "adventure_guild/guild_floor_cobble", "15,35": "adventure_guild/guild_floor_cobble", "16,10": "adventure_guild/guild_floor_basalt", "16,11": "adventure_guild/guild_floor_basalt", "16,12": "adventure_guild/guild_floor_basalt", "16,13": "adventure_guild/guild_floor_basalt", "16,14": "adventure_guild/guild_floor_basalt", "16,15": "adventure_guild/guild_wall_timber_face::obstacle", "16,16": "adventure_guild/guild_floor_flagstone", "16,17": "adventure_guild/guild_floor_flagstone", "16,18": "adventure_guild/guild_floor_flagstone", "16,19": "adventure_guild/guild_floor_flagstone", "16,20": "adventure_guild/guild_floor_flagstone", "16,21": "adventure_guild/guild_floor_flagstone", "16,22": "adventure_guild/guild_floor_flagstone", "16,23": "adventure_guild/guild_floor_flagstone", "16,24": "adventure_guild/guild_floor_flagstone", "16,25": "adventure_guild/guild_floor_flagstone", "16,26": "adventure_guild/guild_floor_flagstone", "16,27": "adventure_guild/guild_floor_flagstone", "16,28": "adventure_guild/guild_floor_flagstone", "16,29": "adventure_guild/guild_floor_flagstone", "16,30": "adventure_guild/guild_wall_cap_h::obstacle", "16,31": "adventure_guild/guild_wall_timber_face::obstacle", "16,32": "adventure_guild/guild_floor_cobble", "16,33": "adventure_guild/guild_floor_cobble", "16,34": "adventure_guild/guild_floor_cobble", "16,35": "adventure_guild/guild_floor_cobble", "17,10": "adventure_guild/guild_floor_basalt", "17,11": "adventure_guild/guild_floor_basalt", "17,12": "adventure_guild/guild_floor_basalt", "17,13": "adventure_guild/guild_floor_basalt", "17,14": "adventure_guild/guild_floor_basalt", "17,15": "adventure_guild/guild_wall_timber_face::obstacle", "17,16": "adventure_guild/guild_floor_flagstone", "17,17": "adventure_guild/guild_floor_flagstone", "17,18": "adventure_guild/guild_floor_flagstone", "17,19": "adventure_guild/guild_floor_flagstone", "17,20": "adventure_guild/guild_floor_flagstone", "17,21": "adventure_guild/guild_floor_flagstone", "17,22": "adventure_guild/guild_floor_flagstone", "17,23": "adventure_guild/guild_floor_flagstone", "17,24": "adventure_guild/guild_floor_flagstone", "17,25": "adventure_guild/guild_floor_flagstone", "17,26": "adventure_guild/guild_floor_flagstone", "17,27": "adventure_guild/guild_floor_flagstone", "17,28": "adventure_guild/guild_floor_flagstone", "17,29": "adventure_guild/guild_floor_flagstone", "17,30": "adventure_guild/guild_wall_cap_h::obstacle", "17,31": "adventure_guild/guild_wall_stained_glass::obstacle", "17,32": "adventure_guild/guild_floor_cobble", "17,33": "adventure_guild/guild_floor_cobble", "17,34": "adventure_guild/guild_floor_cobble", "17,35": "adventure_guild/guild_floor_cobble", "18,10": "adventure_guild/guild_wall_cap_v::obstacle", "18,11": "adventure_guild/guild_wall_end_s::obstacle", "18,12": "adventure_guild/guild_floor_flagstone", "18,13": "adventure_guild/guild_floor_flagstone", "18,14": "adventure_guild/guild_floor_flagstone", "18,15": "adventure_guild/guild_wall_timber_face::obstacle", "18,16": "adventure_guild/guild_floor_flagstone", "18,17": "adventure_guild/guild_floor_flagstone", "18,18": "adventure_guild/guild_floor_flagstone", "18,19": "adventure_guild/guild_floor_flagstone", "18,20": "adventure_guild/guild_floor_flagstone", "18,21": "adventure_guild/guild_floor_flagstone", "18,22": "adventure_guild/guild_floor_flagstone", "18,23": "adventure_guild/guild_floor_flagstone", "18,24": "adventure_guild/guild_floor_flagstone", "18,25": "adventure_guild/guild_floor_flagstone", "18,26": "adventure_guild/guild_floor_flagstone", "18,27": "adventure_guild/guild_floor_flagstone", "18,28": "adventure_guild/guild_floor_flagstone", "18,29": "adventure_guild/guild_floor_flagstone", "18,30": "adventure_guild/guild_wall_cap_h::obstacle", "18,31": "adventure_guild/guild_wall_timber_face::obstacle", "18,32": "adventure_guild/guild_floor_cobble", "18,33": "adventure_guild/guild_floor_cobble", "18,34": "adventure_guild/guild_floor_cobble", "18,35": "adventure_guild/guild_floor_cobble", "19,10": "adventure_guild/guild_floor_arena", "19,11": "adventure_guild/guild_floor_arena", "19,12": "adventure_guild/guild_floor_arena", "19,13": "adventure_guild/guild_floor_arena", "19,14": "adventure_guild/guild_floor_arena", "19,15": "adventure_guild/guild_wall_stained_glass::obstacle", "19,16": "adventure_guild/guild_floor_flagstone", "19,17": "adventure_guild/guild_floor_flagstone", "19,18": "adventure_guild/guild_floor_flagstone", "19,19": "adventure_guild/guild_floor_flagstone", "19,20": "adventure_guild/guild_floor_flagstone", "19,21": "adventure_guild/guild_floor_flagstone", "19,22": "adventure_guild/guild_floor_flagstone", "19,23": "adventure_guild/guild_floor_flagstone", "19,24": "adventure_guild/guild_floor_flagstone", "19,25": "adventure_guild/guild_floor_flagstone", "19,26": "adventure_guild/guild_floor_flagstone", "19,27": "adventure_guild/guild_floor_flagstone", "19,28": "adventure_guild/guild_floor_flagstone", "19,29": "adventure_guild/guild_floor_flagstone", "19,30": "adventure_guild/guild_wall_cap_h::obstacle", "19,31": "adventure_guild/guild_wall_torch_face::obstacle", "19,32": "adventure_guild/guild_floor_cobble", "19,33": "adventure_guild/guild_floor_cobble", "19,34": "adventure_guild/guild_floor_cobble", "19,35": "adventure_guild/guild_floor_cobble", "20,10": "adventure_guild/guild_floor_arena", "20,11": "adventure_guild/guild_floor_arena", "20,12": "adventure_guild/guild_floor_arena", "20,13": "adventure_guild/guild_floor_arena", "20,14": "adventure_guild/guild_floor_arena", "20,15": "adventure_guild/guild_wall_timber_face::obstacle", "20,16": "adventure_guild/guild_floor_flagstone", "20,17": "adventure_guild/guild_floor_flagstone", "20,18": "adventure_guild/guild_floor_flagstone", "20,19": "adventure_guild/guild_floor_flagstone", "20,20": "adventure_guild/guild_floor_flagstone", "20,21": "adventure_guild/guild_floor_flagstone", "20,22": "adventure_guild/guild_floor_flagstone", "20,23": "adventure_guild/guild_floor_flagstone", "20,24": "adventure_guild/guild_floor_flagstone", "20,25": "adventure_guild/guild_floor_flagstone", "20,26": "adventure_guild/guild_floor_flagstone", "20,27": "adventure_guild/guild_floor_flagstone", "20,28": "adventure_guild/guild_floor_flagstone", "20,29": "adventure_guild/guild_floor_flagstone", "20,30": "adventure_guild/guild_wall_cap_h::obstacle", "20,31": "adventure_guild/guild_wall_timber_face::obstacle", "20,32": "adventure_guild/guild_floor_cobble", "20,33": "adventure_guild/guild_floor_cobble", "20,34": "adventure_guild/guild_floor_cobble", "20,35": "adventure_guild/guild_floor_cobble", "21,10": "adventure_guild/guild_floor_arena", "21,11": "adventure_guild/guild_floor_arena", "21,12": "adventure_guild/guild_floor_arena", "21,13": "adventure_guild/guild_floor_arena", "21,14": "adventure_guild/guild_floor_arena", "21,15": "adventure_guild/guild_wall_timber_face::obstacle", "21,16": "adventure_guild/guild_floor_flagstone", "21,17": "adventure_guild/guild_floor_flagstone", "21,18": "adventure_guild/guild_floor_flagstone", "21,19": "adventure_guild/guild_floor_flagstone", "21,20": "adventure_guild/guild_floor_flagstone", "21,21": "adventure_guild/guild_floor_flagstone", "21,22": "adventure_guild/guild_floor_flagstone", "21,23": "adventure_guild/guild_floor_flagstone", "21,24": "adventure_guild/guild_floor_flagstone", "21,25": "adventure_guild/guild_floor_flagstone", "21,26": "adventure_guild/guild_floor_flagstone", "21,27": "adventure_guild/guild_floor_flagstone", "21,28": "adventure_guild/guild_floor_flagstone", "21,29": "adventure_guild/guild_floor_flagstone", "21,30": "adventure_guild/guild_wall_end_r::obstacle", "21,31": "adventure_guild/guild_wall_torch_face::obstacle", "21,32": "adventure_guild/guild_floor_cobble", "21,33": "adventure_guild/guild_floor_cobble", "21,34": "adventure_guild/guild_floor_cobble", "21,35": "adventure_guild/guild_floor_cobble", "22,10": "adventure_guild/guild_floor_arena", "22,11": "adventure_guild/guild_floor_arena", "22,12": "adventure_guild/guild_floor_arena", "22,13": "adventure_guild/guild_floor_arena", "22,14": "adventure_guild/guild_floor_arena", "22,15": "adventure_guild/guild_wall_torch_face::obstacle", "22,16": "adventure_guild/guild_floor_flagstone", "22,17": "adventure_guild/guild_floor_flagstone", "22,18": "adventure_guild/guild_floor_flagstone", "22,19": "adventure_guild/guild_floor_flagstone", "22,20": "adventure_guild/guild_floor_flagstone", "22,21": "adventure_guild/guild_floor_flagstone", "22,22": "adventure_guild/guild_floor_flagstone", "22,23": "adventure_guild/guild_floor_flagstone", "22,24": "adventure_guild/guild_floor_flagstone", "22,25": "adventure_guild/guild_floor_flagstone", "22,26": "adventure_guild/guild_floor_flagstone", "22,27": "adventure_guild/guild_floor_flagstone", "22,28": "adventure_guild/guild_floor_flagstone", "22,29": "adventure_guild/guild_floor_flagstone", "22,30": "adventure_guild/guild_floor_flagstone", "22,31": "adventure_guild/guild_floor_flagstone", "22,32": "adventure_guild/guild_floor_cobble", "22,33": "adventure_guild/guild_floor_cobble", "22,34": "adventure_guild/guild_floor_cobble", "22,35": "adventure_guild/guild_floor_cobble", "23,10": "adventure_guild/guild_floor_arena", "23,11": "adventure_guild/guild_floor_arena", "23,12": "adventure_guild/guild_floor_arena", "23,13": "adventure_guild/guild_floor_arena", "23,14": "adventure_guild/guild_floor_arena", "23,15": "adventure_guild/guild_floor_flagstone", "23,16": "adventure_guild/guild_floor_flagstone", "23,17": "adventure_guild/guild_floor_flagstone", "23,18": "adventure_guild/guild_floor_flagstone", "23,19": "adventure_guild/guild_floor_flagstone", "23,20": "adventure_guild/guild_floor_flagstone", "23,21": "adventure_guild/guild_floor_flagstone", "23,22": "adventure_guild/guild_floor_flagstone", "23,23": "adventure_guild/guild_floor_flagstone", "23,24": "adventure_guild/guild_floor_flagstone", "23,25": "adventure_guild/guild_floor_flagstone", "23,26": "adventure_guild/guild_floor_flagstone", "23,27": "adventure_guild/guild_floor_flagstone", "23,28": "adventure_guild/guild_floor_flagstone", "23,29": "adventure_guild/guild_floor_flagstone", "23,30": "adventure_guild/guild_floor_flagstone", "23,31": "adventure_guild/guild_floor_flagstone", "23,32": "adventure_guild/guild_floor_cobble", "23,33": "adventure_guild/guild_floor_cobble", "23,34": "adventure_guild/guild_floor_cobble", "23,35": "adventure_guild/guild_floor_cobble", "24,10": "adventure_guild/guild_floor_arena", "24,11": "adventure_guild/guild_floor_arena", "24,12": "adventure_guild/guild_floor_arena", "24,13": "adventure_guild/guild_floor_arena", "24,14": "adventure_guild/guild_floor_arena", "24,15": "adventure_guild/guild_floor_flagstone", "24,16": "adventure_guild/guild_floor_flagstone", "24,17": "adventure_guild/guild_floor_flagstone", "24,18": "adventure_guild/guild_floor_flagstone", "24,19": "adventure_guild/guild_floor_flagstone", "24,20": "adventure_guild/guild_floor_flagstone", "24,21": "adventure_guild/guild_floor_flagstone", "24,22": "adventure_guild/guild_floor_flagstone", "24,23": "adventure_guild/guild_floor_flagstone", "24,24": "adventure_guild/guild_floor_flagstone", "24,25": "adventure_guild/guild_floor_flagstone", "24,26": "adventure_guild/guild_floor_flagstone", "24,27": "adventure_guild/guild_floor_flagstone", "24,28": "adventure_guild/guild_floor_flagstone", "24,29": "adventure_guild/guild_floor_flagstone", "24,30": "adventure_guild/guild_floor_flagstone", "24,31": "adventure_guild/guild_floor_flagstone", "24,32": "adventure_guild/guild_floor_cobble", "24,33": "adventure_guild/guild_floor_cobble", "24,34": "adventure_guild/guild_floor_cobble", "24,35": "adventure_guild/guild_floor_cobble", "25,10": "adventure_guild/guild_floor_arena", "25,11": "adventure_guild/guild_floor_arena", "25,12": "adventure_guild/guild_floor_arena", "25,13": "adventure_guild/guild_floor_arena", "25,14": "adventure_guild/guild_floor_arena", "25,15": "adventure_guild/guild_floor_flagstone", "25,16": "adventure_guild/guild_floor_flagstone", "25,17": "adventure_guild/guild_floor_flagstone", "25,18": "adventure_guild/guild_floor_flagstone", "25,19": "adventure_guild/guild_floor_flagstone", "25,20": "adventure_guild/guild_floor_flagstone", "25,21": "adventure_guild/guild_floor_flagstone", "25,22": "adventure_guild/guild_floor_flagstone", "25,23": "adventure_guild/guild_floor_flagstone", "25,24": "adventure_guild/guild_floor_flagstone", "25,25": "adventure_guild/guild_floor_flagstone", "25,26": "adventure_guild/guild_floor_flagstone", "25,27": "adventure_guild/guild_floor_flagstone", "25,28": "adventure_guild/guild_floor_flagstone", "25,29": "adventure_guild/guild_floor_flagstone", "25,30": "adventure_guild/guild_floor_flagstone", "25,31": "adventure_guild/guild_floor_flagstone", "25,32": "adventure_guild/guild_floor_cobble", "25,33": "adventure_guild/guild_floor_cobble", "25,34": "adventure_guild/guild_floor_cobble", "25,35": "adventure_guild/guild_floor_cobble", "26,10": "adventure_guild/guild_floor_arena", "26,11": "adventure_guild/guild_floor_arena", "26,12": "adventure_guild/guild_floor_arena", "26,13": "adventure_guild/guild_floor_arena", "26,14": "adventure_guild/guild_floor_arena", "26,15": "adventure_guild/guild_floor_flagstone", "26,16": "adventure_guild/guild_floor_flagstone", "26,17": "adventure_guild/guild_floor_flagstone", "26,18": "adventure_guild/guild_floor_flagstone", "26,19": "adventure_guild/guild_floor_flagstone", "26,20": "adventure_guild/guild_floor_flagstone", "26,21": "adventure_guild/guild_floor_flagstone", "26,22": "adventure_guild/guild_floor_flagstone", "26,23": "adventure_guild/guild_floor_flagstone", "26,24": "adventure_guild/guild_floor_flagstone", "26,25": "adventure_guild/guild_floor_flagstone", "26,26": "adventure_guild/guild_floor_flagstone", "26,27": "adventure_guild/guild_floor_flagstone", "26,28": "adventure_guild/guild_floor_flagstone", "26,29": "adventure_guild/guild_floor_flagstone", "26,30": "adventure_guild/guild_wall_end_l::obstacle", "26,31": "adventure_guild/guild_wall_torch_face::obstacle", "26,32": "adventure_guild/guild_floor_cobble", "26,33": "adventure_guild/guild_floor_cobble", "26,34": "adventure_guild/guild_floor_cobble", "26,35": "adventure_guild/guild_floor_cobble", "27,10": "adventure_guild/guild_floor_arena", "27,11": "adventure_guild/guild_floor_arena", "27,12": "adventure_guild/guild_floor_arena", "27,13": "adventure_guild/guild_floor_arena", "27,14": "adventure_guild/guild_floor_arena", "27,15": "adventure_guild/guild_wall_timber_face::obstacle", "27,16": "adventure_guild/guild_wall_cap_v::obstacle", "27,17": "adventure_guild/guild_wall_cap_v::obstacle", "27,18": "adventure_guild/guild_floor_arena", "27,19": "adventure_guild/guild_floor_arena", "27,20": "adventure_guild/guild_wall_cap_v::obstacle", "27,21": "adventure_guild/guild_wall_cap_v::obstacle", "27,22": "adventure_guild/guild_wall_cap_v::obstacle", "27,23": "adventure_guild/guild_wall_cap_v::obstacle", "27,24": "adventure_guild/guild_wall_cap_v::obstacle", "27,25": "adventure_guild/guild_wall_cap_v::obstacle", "27,26": "adventure_guild/guild_floor_arena", "27,27": "adventure_guild/guild_floor_arena", "27,28": "adventure_guild/guild_wall_cap_v::obstacle", "27,29": "adventure_guild/guild_wall_cap_v::obstacle", "27,30": "adventure_guild/guild_wall_cap_v::obstacle", "27,31": "adventure_guild/guild_wall_timber_face::obstacle", "27,32": "adventure_guild/guild_floor_cobble", "27,33": "adventure_guild/guild_floor_cobble", "27,34": "adventure_guild/guild_floor_cobble", "27,35": "adventure_guild/guild_floor_cobble", "28,10": "adventure_guild/guild_floor_arena", "28,11": "adventure_guild/guild_floor_arena", "28,12": "adventure_guild/guild_floor_arena", "28,13": "adventure_guild/guild_floor_arena", "28,14": "adventure_guild/guild_floor_arena", "28,15": "adventure_guild/guild_wall_timber_face::obstacle", "28,16": "adventure_guild/guild_floor_arena", "28,17": "adventure_guild/guild_floor_arena", "28,18": "adventure_guild/guild_floor_arena", "28,19": "adventure_guild/guild_floor_arena", "28,20": "adventure_guild/guild_floor_arena", "28,21": "adventure_guild/guild_floor_arena", "28,22": "adventure_guild/guild_floor_arena", "28,23": "adventure_guild/guild_floor_arena", "28,24": "adventure_guild/guild_floor_arena", "28,25": "adventure_guild/guild_floor_arena", "28,26": "adventure_guild/guild_floor_arena", "28,27": "adventure_guild/guild_floor_arena", "28,28": "adventure_guild/guild_floor_arena", "28,29": "adventure_guild/guild_floor_arena", "28,30": "adventure_guild/guild_wall_cap_h::obstacle", "28,31": "adventure_guild/guild_wall_timber_face::obstacle", "28,32": "adventure_guild/guild_floor_cobble", "28,33": "adventure_guild/guild_floor_cobble", "28,34": "adventure_guild/guild_floor_cobble", "28,35": "adventure_guild/guild_floor_cobble", "29,10": "adventure_guild/guild_floor_arena", "29,11": "adventure_guild/guild_floor_arena", "29,12": "adventure_guild/guild_floor_arena", "29,13": "adventure_guild/guild_floor_arena", "29,14": "adventure_guild/guild_floor_arena", "29,15": "adventure_guild/guild_wall_timber_face::obstacle", "29,16": "adventure_guild/guild_floor_arena", "29,17": "adventure_guild/guild_floor_arena", "29,18": "adventure_guild/guild_floor_arena", "29,19": "adventure_guild/guild_floor_arena", "29,20": "adventure_guild/guild_floor_arena", "29,21": "adventure_guild/guild_floor_arena", "29,22": "adventure_guild/guild_floor_arena", "29,23": "adventure_guild/guild_floor_arena", "29,24": "adventure_guild/guild_floor_arena", "29,25": "adventure_guild/guild_floor_arena", "29,26": "adventure_guild/guild_floor_arena", "29,27": "adventure_guild/guild_floor_arena", "29,28": "adventure_guild/guild_floor_arena", "29,29": "adventure_guild/guild_floor_arena", "29,30": "adventure_guild/guild_wall_cap_h::obstacle", "29,31": "adventure_guild/guild_wall_stained_glass::obstacle", "29,32": "adventure_guild/guild_floor_cobble", "29,33": "adventure_guild/guild_floor_cobble", "29,34": "adventure_guild/guild_floor_cobble", "29,35": "adventure_guild/guild_floor_cobble", "30,10": "adventure_guild/guild_floor_arena", "30,11": "adventure_guild/guild_floor_arena", "30,12": "adventure_guild/guild_floor_arena", "30,13": "adventure_guild/guild_floor_arena", "30,14": "adventure_guild/guild_floor_arena", "30,15": "adventure_guild/guild_wall_stained_glass::obstacle", "30,16": "adventure_guild/guild_floor_arena", "30,17": "adventure_guild/guild_floor_arena", "30,18": "adventure_guild/guild_floor_arena", "30,19": "adventure_guild/guild_floor_arena", "30,20": "adventure_guild/guild_floor_arena", "30,21": "adventure_guild/guild_floor_arena", "30,22": "adventure_guild/guild_floor_arena", "30,23": "adventure_guild/guild_floor_arena", "30,24": "adventure_guild/guild_floor_arena", "30,25": "adventure_guild/guild_floor_arena", "30,26": "adventure_guild/guild_floor_arena", "30,27": "adventure_guild/guild_floor_arena", "30,28": "adventure_guild/guild_floor_arena", "30,29": "adventure_guild/guild_floor_arena", "30,30": "adventure_guild/guild_wall_cap_h::obstacle", "30,31": "adventure_guild/guild_wall_timber_face::obstacle", "30,32": "adventure_guild/guild_floor_cobble", "30,33": "adventure_guild/guild_floor_cobble", "30,34": "adventure_guild/guild_floor_cobble", "30,35": "adventure_guild/guild_floor_cobble", "31,10": "adventure_guild/guild_floor_flagstone", "31,11": "adventure_guild/guild_floor_flagstone", "31,12": "adventure_guild/guild_wall_timber_face::obstacle", "31,13": "adventure_guild/guild_floor_flagstone", "31,14": "adventure_guild/guild_floor_flagstone", "31,15": "adventure_guild/guild_wall_timber_face::obstacle", "31,16": "adventure_guild/guild_floor_arena", "31,17": "adventure_guild/guild_floor_arena", "31,18": "adventure_guild/guild_floor_arena", "31,19": "adventure_guild/guild_floor_arena", "31,20": "adventure_guild/guild_floor_arena", "31,21": "adventure_guild/guild_floor_arena", "31,22": "adventure_guild/guild_floor_arena", "31,23": "adventure_guild/guild_floor_arena", "31,24": "adventure_guild/guild_floor_arena", "31,25": "adventure_guild/guild_floor_arena", "31,26": "adventure_guild/guild_floor_arena", "31,27": "adventure_guild/guild_floor_arena", "31,28": "adventure_guild/guild_floor_arena", "31,29": "adventure_guild/guild_floor_arena", "31,30": "adventure_guild/guild_wall_cap_h::obstacle", "31,31": "adventure_guild/guild_wall_torch_face::obstacle", "31,32": "adventure_guild/guild_floor_cobble", "31,33": "adventure_guild/guild_floor_cobble", "31,34": "adventure_guild/guild_floor_cobble", "31,35": "adventure_guild/guild_floor_cobble", "32,10": "adventure_guild/guild_floor_sanctum", "32,11": "adventure_guild/guild_floor_sanctum", "32,12": "adventure_guild/guild_wall_torch_face::obstacle", "32,13": "adventure_guild/guild_floor_flagstone", "32,14": "adventure_guild/guild_floor_flagstone", "32,15": "adventure_guild/guild_wall_timber_face::obstacle", "32,16": "adventure_guild/guild_floor_arena", "32,17": "adventure_guild/guild_floor_arena", "32,18": "adventure_guild/guild_floor_arena", "32,19": "adventure_guild/guild_floor_arena", "32,20": "adventure_guild/guild_floor_arena", "32,21": "adventure_guild/guild_floor_arena", "32,22": "adventure_guild/guild_floor_arena", "32,23": "adventure_guild/guild_floor_arena", "32,24": "adventure_guild/guild_floor_arena", "32,25": "adventure_guild/guild_floor_arena", "32,26": "adventure_guild/guild_floor_arena", "32,27": "adventure_guild/guild_floor_arena", "32,28": "adventure_guild/guild_floor_arena", "32,29": "adventure_guild/guild_floor_arena", "32,30": "adventure_guild/guild_wall_cap_h::obstacle", "32,31": "adventure_guild/guild_wall_timber_face::obstacle", "32,32": "adventure_guild/guild_floor_cobble", "32,33": "adventure_guild/guild_floor_cobble", "32,34": "adventure_guild/guild_floor_cobble", "32,35": "adventure_guild/guild_floor_cobble", "33,10": "adventure_guild/guild_floor_sanctum", "33,11": "adventure_guild/guild_floor_sanctum", "33,12": "adventure_guild/guild_wall_timber_face::obstacle", "33,13": "adventure_guild/guild_floor_flagstone", "33,14": "adventure_guild/guild_floor_flagstone", "33,15": "adventure_guild/guild_wall_timber_face::obstacle", "33,16": "adventure_guild/guild_floor_arena", "33,17": "adventure_guild/guild_floor_arena", "33,18": "adventure_guild/guild_floor_arena", "33,19": "adventure_guild/guild_floor_arena", "33,20": "adventure_guild/guild_floor_arena", "33,21": "adventure_guild/guild_floor_arena", "33,22": "adventure_guild/guild_floor_arena", "33,23": "adventure_guild/guild_floor_arena", "33,24": "adventure_guild/guild_floor_arena", "33,25": "adventure_guild/guild_floor_arena", "33,26": "adventure_guild/guild_floor_arena", "33,27": "adventure_guild/guild_floor_arena", "33,28": "adventure_guild/guild_floor_arena", "33,29": "adventure_guild/guild_floor_arena", "33,30": "adventure_guild/guild_wall_cap_h::obstacle", "33,31": "adventure_guild/guild_wall_stained_glass::obstacle", "33,32": "adventure_guild/guild_floor_cobble", "33,33": "adventure_guild/guild_floor_cobble", "33,34": "adventure_guild/guild_floor_cobble", "33,35": "adventure_guild/guild_floor_cobble", "34,10": "adventure_guild/guild_floor_sanctum", "34,11": "adventure_guild/guild_floor_sanctum", "34,12": "adventure_guild/guild_wall_stained_glass::obstacle", "34,13": "adventure_guild/guild_floor_flagstone", "34,14": "adventure_guild/guild_floor_flagstone", "34,15": "adventure_guild/guild_wall_stained_glass::obstacle", "34,16": "adventure_guild/guild_floor_arena", "34,17": "adventure_guild/guild_floor_arena", "34,18": "adventure_guild/guild_floor_arena", "34,19": "adventure_guild/guild_floor_arena", "34,20": "adventure_guild/guild_floor_arena", "34,21": "adventure_guild/guild_floor_arena", "34,22": "adventure_guild/guild_floor_arena", "34,23": "adventure_guild/guild_floor_arena", "34,24": "adventure_guild/guild_floor_arena", "34,25": "adventure_guild/guild_floor_arena", "34,26": "adventure_guild/guild_floor_arena", "34,27": "adventure_guild/guild_floor_arena", "34,28": "adventure_guild/guild_floor_arena", "34,29": "adventure_guild/guild_floor_arena", "34,30": "adventure_guild/guild_wall_cap_h::obstacle", "34,31": "adventure_guild/guild_wall_timber_face::obstacle", "34,32": "adventure_guild/guild_floor_cobble", "34,33": "grass_4", "34,34": "grass_4", "34,35": "grass_4", "35,10": "adventure_guild/guild_floor_sanctum", "35,11": "adventure_guild/guild_floor_sanctum", "35,12": "adventure_guild/guild_wall_timber_face::obstacle", "35,13": "adventure_guild/guild_floor_flagstone", "35,14": "adventure_guild/guild_floor_flagstone", "35,15": "adventure_guild/guild_wall_timber_face::obstacle", "35,16": "adventure_guild/guild_floor_arena", "35,17": "adventure_guild/guild_floor_arena", "35,18": "adventure_guild/guild_floor_arena", "35,19": "adventure_guild/guild_floor_arena", "35,20": "adventure_guild/guild_floor_arena", "35,21": "adventure_guild/guild_floor_arena", "35,22": "adventure_guild/guild_floor_arena", "35,23": "adventure_guild/guild_floor_arena", "35,24": "adventure_guild/guild_floor_arena", "35,25": "adventure_guild/guild_floor_arena", "35,26": "adventure_guild/guild_floor_arena", "35,27": "adventure_guild/guild_floor_arena", "35,28": "adventure_guild/guild_floor_arena", "35,29": "adventure_guild/guild_floor_arena", "35,30": "adventure_guild/guild_wall_cap_h::obstacle", "35,31": "adventure_guild/guild_wall_timber_face::obstacle", "35,32": "adventure_guild/guild_floor_cobble", "35,33": "grass_4", "35,34": "grass_4", "35,35": "grass_4", "36,10": "adventure_guild/guild_floor_sanctum", "36,11": "adventure_guild/guild_floor_sanctum", "36,12": "adventure_guild/guild_wall_timber_face::obstacle", "36,13": "adventure_guild/guild_floor_flagstone", "36,14": "adventure_guild/guild_floor_flagstone", "36,15": "adventure_guild/guild_wall_torch_face::obstacle", "36,16": "adventure_guild/guild_floor_arena", "36,17": "adventure_guild/guild_floor_arena", "36,18": "adventure_guild/guild_floor_arena", "36,19": "adventure_guild/guild_floor_arena", "36,20": "adventure_guild/guild_floor_arena", "36,21": "adventure_guild/guild_floor_arena", "36,22": "adventure_guild/guild_floor_arena", "36,23": "adventure_guild/guild_floor_arena", "36,24": "adventure_guild/guild_floor_arena", "36,25": "adventure_guild/guild_floor_arena", "36,26": "adventure_guild/guild_floor_arena", "36,27": "adventure_guild/guild_floor_arena", "36,28": "adventure_guild/guild_floor_arena", "36,29": "adventure_guild/guild_floor_arena", "36,30": "adventure_guild/guild_wall_cap_h::obstacle", "36,31": "adventure_guild/guild_wall_torch_face::obstacle", "36,32": "adventure_guild/guild_floor_cobble", "36,33": "grass_4", "36,34": "grass_4", "36,35": "grass_4", "37,10": "adventure_guild/guild_floor_sanctum", "37,11": "adventure_guild/guild_floor_sanctum", "37,12": "adventure_guild/guild_wall_timber_face::obstacle", "37,13": "adventure_guild/guild_floor_flagstone", "37,14": "adventure_guild/guild_floor_flagstone", "37,15": "adventure_guild/guild_wall_timber_face::obstacle", "37,16": "adventure_guild/guild_wall_cap_v::obstacle", "37,17": "adventure_guild/guild_wall_cap_v::obstacle", "37,18": "adventure_guild/guild_wall_cap_v::obstacle", "37,19": "adventure_guild/guild_wall_cap_v::obstacle", "37,20": "adventure_guild/guild_wall_cap_v::obstacle", "37,21": "adventure_guild/guild_floor_flagstone", "37,22": "adventure_guild/guild_floor_flagstone", "37,23": "adventure_guild/guild_wall_cap_v::obstacle", "37,24": "adventure_guild/guild_wall_cap_v::obstacle", "37,25": "adventure_guild/guild_wall_cap_v::obstacle", "37,26": "adventure_guild/guild_wall_cap_v::obstacle", "37,27": "adventure_guild/guild_wall_cap_v::obstacle", "37,28": "adventure_guild/guild_wall_cap_v::obstacle", "37,29": "adventure_guild/guild_wall_cap_v::obstacle", "37,30": "adventure_guild/guild_wall_cap_v::obstacle", "37,31": "adventure_guild/guild_wall_timber_face::obstacle", "37,32": "adventure_guild/guild_floor_cobble", "37,33": "grass_4", "37,34": "grass_4", "37,35": "grass_4", "38,10": "adventure_guild/guild_floor_sanctum", "38,11": "adventure_guild/guild_floor_sanctum", "38,12": "adventure_guild/guild_wall_stained_glass::obstacle", "38,13": "adventure_guild/guild_floor_flagstone", "38,14": "adventure_guild/guild_floor_flagstone", "38,15": "adventure_guild/guild_floor_flagstone", "38,16": "adventure_guild/guild_floor_flagstone", "38,17": "adventure_guild/guild_floor_flagstone", "38,18": "adventure_guild/guild_floor_flagstone", "38,19": "adventure_guild/guild_floor_flagstone", "38,20": "adventure_guild/guild_floor_flagstone", "38,21": "adventure_guild/guild_floor_flagstone", "38,22": "adventure_guild/guild_floor_flagstone", "38,23": "adventure_guild/guild_floor_flagstone", "38,24": "adventure_guild/guild_floor_flagstone", "38,25": "adventure_guild/guild_floor_flagstone", "38,26": "adventure_guild/guild_floor_flagstone", "38,27": "adventure_guild/guild_floor_flagstone", "38,28": "adventure_guild/guild_floor_flagstone", "38,29": "adventure_guild/guild_floor_flagstone", "38,30": "adventure_guild/guild_wall_cap_h::obstacle", "38,31": "adventure_guild/guild_wall_timber_face::obstacle", "38,32": "grass_4", "38,33": "grass_4", "38,34": "grass_4", "38,35": "grass_4", "39,10": "adventure_guild/guild_floor_sanctum", "39,11": "adventure_guild/guild_floor_sanctum", "39,12": "adventure_guild/guild_wall_timber_face::obstacle", "39,13": "adventure_guild/guild_floor_flagstone", "39,14": "adventure_guild/guild_floor_flagstone", "39,15": "adventure_guild/guild_floor_flagstone", "39,16": "adventure_guild/guild_floor_flagstone", "39,17": "adventure_guild/guild_floor_flagstone", "39,18": "adventure_guild/guild_floor_flagstone", "39,19": "adventure_guild/guild_floor_flagstone", "39,20": "adventure_guild/guild_floor_flagstone", "39,21": "adventure_guild/guild_floor_flagstone", "39,22": "adventure_guild/guild_floor_flagstone", "39,23": "adventure_guild/guild_floor_flagstone", "39,24": "adventure_guild/guild_floor_flagstone", "39,25": "adventure_guild/guild_floor_flagstone", "39,26": "adventure_guild/guild_floor_flagstone", "39,27": "adventure_guild/guild_floor_flagstone", "39,28": "adventure_guild/guild_floor_flagstone", "39,29": "adventure_guild/guild_floor_flagstone", "39,30": "adventure_guild/guild_wall_cap_h::obstacle", "39,31": "adventure_guild/guild_wall_timber_face::obstacle", "39,32": "grass_4", "39,33": "grass_4", "39,34": "grass_4", "39,35": "grass_4", "40,10": "adventure_guild/guild_floor_sanctum", "40,11": "adventure_guild/guild_floor_sanctum", "40,12": "adventure_guild/guild_wall_torch_face::obstacle", "40,13": "adventure_guild/guild_floor_flagstone", "40,14": "adventure_guild/guild_floor_flagstone", "40,15": "adventure_guild/guild_floor_flagstone", "40,16": "adventure_guild/guild_floor_flagstone", "40,17": "adventure_guild/guild_floor_flagstone", "40,18": "adventure_guild/guild_floor_flagstone", "40,19": "adventure_guild/guild_floor_flagstone", "40,20": "adventure_guild/guild_floor_flagstone", "40,21": "adventure_guild/guild_floor_flagstone", "40,22": "adventure_guild/guild_floor_flagstone", "40,23": "adventure_guild/guild_floor_flagstone", "40,24": "adventure_guild/guild_floor_flagstone", "40,25": "adventure_guild/guild_floor_flagstone", "40,26": "adventure_guild/guild_floor_flagstone", "40,27": "adventure_guild/guild_floor_flagstone", "40,28": "adventure_guild/guild_floor_flagstone", "40,29": "adventure_guild/guild_floor_flagstone", "40,30": "adventure_guild/guild_wall_cap_h::obstacle", "40,31": "adventure_guild/guild_wall_stained_glass::obstacle", "40,32": "grass_4", "40,33": "grass_4", "40,34": "grass_4", "40,35": "grass_4", "41,10": "adventure_guild/guild_floor_sanctum", "41,11": "adventure_guild/guild_floor_sanctum", "41,12": "adventure_guild/guild_floor_flagstone", "41,13": "adventure_guild/guild_floor_flagstone", "41,14": "adventure_guild/guild_floor_flagstone", "41,15": "adventure_guild/guild_floor_flagstone", "41,16": "adventure_guild/guild_floor_flagstone", "41,17": "adventure_guild/guild_floor_flagstone", "41,18": "adventure_guild/guild_floor_flagstone", "41,19": "adventure_guild/guild_floor_flagstone", "41,20": "adventure_guild/guild_floor_flagstone", "41,21": "adventure_guild/guild_floor_flagstone", "41,22": "adventure_guild/guild_floor_flagstone", "41,23": "adventure_guild/guild_floor_flagstone", "41,24": "adventure_guild/guild_floor_flagstone", "41,25": "adventure_guild/guild_floor_flagstone", "41,26": "adventure_guild/guild_floor_flagstone", "41,27": "adventure_guild/guild_floor_flagstone", "41,28": "adventure_guild/guild_floor_flagstone", "41,29": "adventure_guild/guild_floor_flagstone", "41,30": "adventure_guild/guild_wall_cap_h::obstacle", "41,31": "adventure_guild/guild_wall_timber_face::obstacle", "41,32": "grass_4", "41,33": "grass_4", "41,34": "grass_4", "41,35": "grass_4", "42,10": "adventure_guild/guild_floor_sanctum", "42,11": "adventure_guild/guild_floor_sanctum", "42,12": "adventure_guild/guild_floor_flagstone", "42,13": "adventure_guild/guild_floor_flagstone", "42,14": "adventure_guild/guild_floor_flagstone", "42,15": "adventure_guild/guild_floor_flagstone", "42,16": "adventure_guild/guild_floor_flagstone", "42,17": "adventure_guild/guild_floor_flagstone", "42,18": "adventure_guild/guild_floor_flagstone", "42,19": "adventure_guild/guild_floor_flagstone", "42,20": "adventure_guild/guild_floor_flagstone", "42,21": "adventure_guild/guild_floor_flagstone", "42,22": "adventure_guild/guild_floor_flagstone", "42,23": "adventure_guild/guild_floor_flagstone", "42,24": "adventure_guild/guild_floor_flagstone", "42,25": "adventure_guild/guild_floor_flagstone", "42,26": "adventure_guild/guild_floor_flagstone", "42,27": "adventure_guild/guild_floor_flagstone", "42,28": "adventure_guild/guild_floor_flagstone", "42,29": "adventure_guild/guild_floor_flagstone", "42,30": "adventure_guild/guild_wall_cap_h::obstacle", "42,31": "adventure_guild/guild_wall_torch_face::obstacle", "42,32": "grass_4", "42,33": "grass_4", "42,34": "grass_4", "42,35": "grass_4", "43,10": "adventure_guild/guild_floor_sanctum", "43,11": "adventure_guild/guild_floor_sanctum", "43,12": "adventure_guild/guild_wall_timber_face::obstacle", "43,13": "adventure_guild/guild_floor_flagstone", "43,14": "adventure_guild/guild_floor_flagstone", "43,15": "adventure_guild/guild_floor_flagstone", "43,16": "adventure_guild/guild_floor_flagstone", "43,17": "adventure_guild/guild_floor_flagstone", "43,18": "adventure_guild/guild_floor_flagstone", "43,19": "adventure_guild/guild_floor_flagstone", "43,20": "adventure_guild/guild_floor_flagstone", "43,21": "adventure_guild/guild_floor_flagstone", "43,22": "adventure_guild/guild_floor_flagstone", "43,23": "adventure_guild/guild_floor_flagstone", "43,24": "adventure_guild/guild_floor_flagstone", "43,25": "adventure_guild/guild_floor_flagstone", "43,26": "adventure_guild/guild_floor_flagstone", "43,27": "adventure_guild/guild_floor_flagstone", "43,28": "adventure_guild/guild_floor_flagstone", "43,29": "adventure_guild/guild_floor_flagstone", "43,30": "adventure_guild/guild_wall_cap_h::obstacle", "43,31": "adventure_guild/guild_wall_timber_face::obstacle", "43,32": "grass_4", "43,33": "grass_4", "43,34": "grass_4", "43,35": "grass_4", "44,10": "adventure_guild/guild_floor_sanctum", "44,11": "adventure_guild/guild_floor_sanctum", "44,12": "adventure_guild/guild_wall_stained_glass::obstacle", "44,13": "adventure_guild/guild_floor_flagstone", "44,14": "adventure_guild/guild_floor_flagstone", "44,15": "adventure_guild/guild_floor_flagstone", "44,16": "adventure_guild/guild_floor_flagstone", "44,17": "adventure_guild/guild_floor_flagstone", "44,18": "adventure_guild/guild_floor_flagstone", "44,19": "adventure_guild/guild_floor_flagstone", "44,20": "adventure_guild/guild_floor_flagstone", "44,21": "adventure_guild/guild_floor_flagstone", "44,22": "adventure_guild/guild_floor_flagstone", "44,23": "adventure_guild/guild_floor_flagstone", "44,24": "adventure_guild/guild_floor_flagstone", "44,25": "adventure_guild/guild_floor_flagstone", "44,26": "adventure_guild/guild_floor_flagstone", "44,27": "adventure_guild/guild_floor_flagstone", "44,28": "adventure_guild/guild_floor_flagstone", "44,29": "adventure_guild/guild_floor_flagstone", "44,30": "adventure_guild/guild_wall_cap_h::obstacle", "44,31": "adventure_guild/guild_wall_stained_glass::obstacle", "44,32": "grass_4", "44,33": "grass_4", "44,34": "grass_4", "44,35": "grass_4", "45,10": "adventure_guild/guild_floor_sanctum", "45,11": "adventure_guild/guild_floor_sanctum", "45,12": "adventure_guild/guild_wall_timber_face::obstacle", "45,13": "adventure_guild/guild_floor_flagstone", "45,14": "adventure_guild/guild_floor_flagstone", "45,15": "adventure_guild/guild_floor_flagstone", "45,16": "adventure_guild/guild_floor_flagstone", "45,17": "adventure_guild/guild_floor_flagstone", "45,18": "adventure_guild/guild_floor_flagstone", "45,19": "adventure_guild/guild_floor_flagstone", "45,20": "adventure_guild/guild_floor_flagstone", "45,21": "adventure_guild/guild_floor_flagstone", "45,22": "adventure_guild/guild_floor_flagstone", "45,23": "adventure_guild/guild_floor_flagstone", "45,24": "adventure_guild/guild_floor_flagstone", "45,25": "adventure_guild/guild_floor_flagstone", "45,26": "adventure_guild/guild_floor_flagstone", "45,27": "adventure_guild/guild_floor_flagstone", "45,28": "adventure_guild/guild_floor_flagstone", "45,29": "adventure_guild/guild_floor_flagstone", "45,30": "adventure_guild/guild_wall_cap_h::obstacle", "45,31": "adventure_guild/guild_wall_timber_face::obstacle", "45,32": "grass_4", "45,33": "grass_4", "45,34": "grass_4", "45,35": "grass_4", "46,10": "adventure_guild/guild_wall_cap_v::obstacle", "46,11": "adventure_guild/guild_wall_cap_v::obstacle", "46,12": "adventure_guild/guild_wall_cap_v::obstacle", "46,13": "adventure_guild/guild_wall_cap_v::obstacle", "46,14": "adventure_guild/guild_wall_cap_v::obstacle", "46,15": "adventure_guild/guild_wall_cap_v::obstacle", "46,16": "adventure_guild/guild_wall_cap_v::obstacle", "46,17": "adventure_guild/guild_wall_cap_v::obstacle", "46,18": "adventure_guild/guild_wall_cap_v::obstacle", "46,19": "adventure_guild/guild_wall_cap_v::obstacle", "46,20": "adventure_guild/guild_wall_cap_v::obstacle", "46,21": "adventure_guild/guild_wall_cap_v::obstacle", "46,22": "adventure_guild/guild_wall_cap_v::obstacle", "46,23": "adventure_guild/guild_wall_cap_v::obstacle", "46,24": "adventure_guild/guild_wall_cap_v::obstacle", "46,25": "adventure_guild/guild_wall_cap_v::obstacle", "46,26": "adventure_guild/guild_wall_cap_v::obstacle", "46,27": "adventure_guild/guild_wall_cap_v::obstacle", "46,28": "adventure_guild/guild_wall_cap_v::obstacle", "46,29": "adventure_guild/guild_wall_cap_v::obstacle", "46,30": "adventure_guild/guild_wall_cap_v::obstacle", "46,31": "adventure_guild/guild_wall_cap_v::obstacle", "46,32": "grass_4", "46,33": "grass_4", "46,34": "grass_4", "46,35": "grass_4", "47,10": "grass_4", "47,11": "grass_4", "47,12": "grass_4", "47,13": "grass_4", "47,14": "grass_4", "47,15": "grass_4", "47,16": "grass_4", "47,17": "grass_4", "47,18": "grass_4", "47,19": "grass_4", "47,20": "grass_4", "47,21": "grass_4", "47,22": "grass_4", "47,23": "grass_4", "47,24": "grass_4", "47,25": "grass_4", "47,26": "grass_4", "47,27": "grass_4", "47,28": "grass_4", "47,29": "grass_4", "47,30": "grass_4", "47,31": "grass_4", "47,32": "grass_4", "47,33": "grass_4", "47,34": "grass_4", "47,35": "grass_4", "spawn_point": "24,34", "freeform:deco_guild_001": "adventure_guild/guild_royal_runner|none::1200,1605::passable::behind::layer:-1", "freeform:deco_guild_002": "adventure_guild/guild_statue_griffin|none::970,1648::solid::behind::layer:0", "freeform:deco_guild_003": "adventure_guild/guild_statue_griffin|none::1430,1648::solid::behind::layer:0::flipx", "freeform:deco_guild_004": "adventure_guild/guild_brazier_flame|none::865,1648::solid::behind::layer:0", "freeform:deco_guild_005": "adventure_guild/guild_brazier_flame|none::1535,1648::solid::behind::layer:0", "freeform:deco_guild_006": "adventure_guild/guild_brazier_flame|none::1055,1745::solid::behind::layer:0", "freeform:deco_guild_007": "adventure_guild/guild_brazier_flame|none::1345,1745::solid::behind::layer:0", "freeform:deco_guild_008": "adventure_guild/guild_town_crier_pillar|none::655,1652::solid::behind::layer:0", "freeform:deco_guild_009": "adventure_guild/guild_crates_barrels|none::1755,1652::solid::behind::layer:0", "freeform:deco_guild_010": "adventure_guild/guild_oak_tree|none::145,1695::solid::behind::layer:0", "freeform:deco_guild_011": "adventure_guild/guild_oak_tree|none::335,1730::solid::behind::layer:0", "freeform:deco_guild_012": "adventure_guild/guild_oak_tree|none::495,1685::solid::behind::layer:0", "freeform:deco_guild_013": "adventure_guild/guild_oak_tree|none::1935,1685::solid::behind::layer:0", "freeform:deco_guild_014": "adventure_guild/guild_oak_tree|none::2095,1730::solid::behind::layer:0", "freeform:deco_guild_015": "adventure_guild/guild_oak_tree|none::2255,1695::solid::behind::layer:0", "freeform:deco_guild_016": "adventure_guild/guild_courtyard_bush|none::240,1648::solid::behind::layer:0", "freeform:deco_guild_017": "adventure_guild/guild_courtyard_bush|none::415,1648::solid::behind::layer:0", "freeform:deco_guild_018": "adventure_guild/guild_courtyard_bush|none::565,1745::solid::behind::layer:0", "freeform:deco_guild_019": "adventure_guild/guild_courtyard_bush|none::755,1745::solid::behind::layer:0", "freeform:deco_guild_020": "adventure_guild/guild_courtyard_bush|none::1645,1745::solid::behind::layer:0", "freeform:deco_guild_021": "adventure_guild/guild_courtyard_bush|none::1865,1745::solid::behind::layer:0", "freeform:deco_guild_022": "adventure_guild/guild_courtyard_bush|none::2015,1648::solid::behind::layer:0", "freeform:deco_guild_023": "adventure_guild/guild_courtyard_bush|none::2175,1648::solid::behind::layer:0", "freeform:deco_guild_024": "adventure_guild/guild_oak_bench|none::355,1645::solid::behind::layer:0", "freeform:deco_guild_025": "adventure_guild/guild_oak_bench|none::2085,1645::solid::behind::layer:0", "freeform:deco_guild_026": "adventure_guild/guild_npc_guard|none::970,1735::solid::behind::layer:0", "freeform:deco_guild_027": "adventure_guild/guild_npc_guard|none::1430,1735::solid::behind::layer:0::flipx", "freeform:deco_guild_028": "adventure_guild/guild_quest_board_s|none::340,860::solid::behind::layer:0::interact:calendar", "freeform:deco_guild_029": "adventure_guild/guild_quest_board_bc|none::950,860::solid::behind::layer:0::interact:calendar", "freeform:deco_guild_030": "adventure_guild/guild_trophy_wall|none::142,920::solid::behind::layer:0", "freeform:deco_guild_031": "adventure_guild/guild_founder_armor|none::142,1110::solid::behind::layer:0", "freeform:deco_guild_032": "adventure_guild/guild_founder_armor|none::142,1235::solid::behind::layer:0", "freeform:deco_guild_033": "adventure_guild/guild_reward_chests|none::285,1438::solid::behind::layer:0", "freeform:deco_guild_034": "adventure_guild/guild_war_map_table|none::465,1085::solid::behind::layer:0", "freeform:deco_guild_035": "adventure_guild/guild_feast_table|none::715,1020::solid::behind::layer:0", "freeform:deco_guild_036": "adventure_guild/guild_npc_receptionist|none::875,1268::solid::behind::layer:1::interact:inventory", "freeform:deco_guild_037": "adventure_guild/guild_reception_counter|none::875,1318::solid::behind::layer:0::interact:inventory", "freeform:deco_guild_038": "adventure_guild/guild_reception_wing|none::735,1322::solid::behind::layer:0", "freeform:deco_guild_039": "adventure_guild/guild_rank_podium|none::1005,1285::solid::behind::layer:0", "freeform:deco_guild_040": "adventure_guild/guild_party_board|none::1296,1065::solid::behind::layer:0::interact:calendar", "freeform:deco_guild_041": "adventure_guild/guild_oak_bench|none::505,1425::solid::behind::layer:0", "freeform:deco_guild_042": "adventure_guild/guild_oak_bench|none::635,1425::solid::behind::layer:0", "freeform:deco_guild_043": "adventure_guild/guild_brazier_flame|none::1095,1435::solid::behind::layer:0", "freeform:deco_guild_044": "adventure_guild/guild_brazier_flame|none::1300,1435::solid::behind::layer:0", "freeform:deco_guild_045": "adventure_guild/guild_royal_runner|none::1200,1436::passable::behind::layer:-1", "freeform:deco_guild_046": "adventure_guild/guild_royal_runner|none::1200,1312::passable::behind::layer:-1", "freeform:deco_guild_047": "adventure_guild/guild_royal_runner|none::1200,1188::passable::behind::layer:-1", "freeform:deco_guild_048": "adventure_guild/guild_royal_runner|none::1200,1064::passable::behind::layer:-1", "freeform:deco_guild_049": "adventure_guild/guild_royal_runner|none::1200,940::passable::behind::layer:-1", "freeform:deco_guild_050": "adventure_guild/guild_tavern_bar|none::1690,945::solid::behind::layer:0", "freeform:deco_guild_051": "adventure_guild/guild_ale_kegs|none::1815,920::solid::behind::layer:0", "freeform:deco_guild_052": "adventure_guild/guild_npc_barkeep|none::1756,920::solid::behind::layer:0::interact:inventory", "freeform:deco_guild_053": "adventure_guild/guild_feast_table|none::1500,905::solid::behind::layer:0", "freeform:deco_guild_054": "adventure_guild/guild_feast_table|none::1500,1145::solid::behind::layer:0", "freeform:deco_guild_055": "adventure_guild/guild_bard_stage|none::1500,1415::passable::behind::layer:-1", "freeform:deco_guild_056": "adventure_guild/guild_npc_bard|none::1500,1392::solid::behind::layer:1", "freeform:deco_guild_057": "adventure_guild/guild_hearth_fireplace|none::1720,1435::solid::behind::layer:0", "freeform:deco_guild_058": "adventure_guild/guild_smelting_forge|none::240,162::solid::behind::layer:0", "freeform:deco_guild_059": "adventure_guild/guild_anvil_station|none::305,315::solid::behind::layer:0", "freeform:deco_guild_060": "adventure_guild/guild_npc_blacksmith|none::222,312::solid::behind::layer:0::interact:inventory", "freeform:deco_guild_061": "adventure_guild/guild_weapon_rack|none::495,160::solid::behind::layer:0", "freeform:deco_guild_062": "adventure_guild/guild_shield_rack|none::745,160::solid::behind::layer:0", "freeform:deco_guild_063": "adventure_guild/guild_armor_mannequin|none::142,445::solid::behind::layer:0", "freeform:deco_guild_064": "adventure_guild/guild_armor_mannequin|none::142,565::solid::behind::layer:0", "freeform:deco_guild_065": "adventure_guild/guild_enchant_table|none::695,435::solid::behind::layer:0", "freeform:deco_guild_066": "adventure_guild/guild_npc_enchanter|none::588,435::solid::behind::layer:0", "freeform:deco_guild_067": "adventure_guild/guild_archery_targets|none::1140,160::solid::behind::layer:0", "freeform:deco_guild_068": "adventure_guild/guild_training_dummy|none::1465,290::solid::behind::layer:0", "freeform:deco_guild_069": "adventure_guild/guild_sparring_ring|none::1200,445::passable::behind::layer:-1", "freeform:deco_guild_070": "adventure_guild/guild_npc_instructor|none::1200,415::solid::behind::layer:0", "freeform:deco_guild_071": "adventure_guild/guild_oak_bench|none::1045,685::solid::behind::layer:0", "freeform:deco_guild_072": "adventure_guild/guild_oak_bench|none::1405,685::solid::behind::layer:0", "freeform:deco_guild_073": "adventure_guild/guild_alchemy_cauldron|none::2215,765::solid::behind::layer:0", "freeform:deco_guild_074": "adventure_guild/guild_alchemy_cauldron|none::2215,895::solid::behind::layer:0", "freeform:deco_guild_075": "adventure_guild/guild_herb_rack|none::2215,1025::solid::behind::layer:0", "freeform:deco_guild_076": "adventure_guild/guild_npc_alchemist|none::2115,830::solid::behind::layer:0::interact:inventory", "freeform:deco_guild_077": "adventure_guild/guild_infirmary_cot|none::2005,1235::solid::behind::layer:0", "freeform:deco_guild_078": "adventure_guild/guild_infirmary_cot|none::2215,1235::solid::behind::layer:0", "freeform:deco_guild_079": "adventure_guild/guild_mana_fountain|none::2100,1435::solid::behind::layer:0", "freeform:deco_guild_080": "adventure_guild/guild_bestiary_shelf|none::1665,225::solid::behind::layer:0", "freeform:deco_guild_081": "adventure_guild/guild_bestiary_shelf|none::1665,395::solid::behind::layer:0", "freeform:deco_guild_082": "adventure_guild/guild_armor_mannequin|none::1805,165::solid::behind::layer:0", "freeform:deco_guild_083": "adventure_guild/guild_armor_mannequin|none::2085,165::solid::behind::layer:0", "freeform:deco_guild_084": "adventure_guild/guild_feast_table|none::1835,325::solid::behind::layer:0", "freeform:deco_guild_085": "adventure_guild/guild_guildmaster_desk|none::2120,295::solid::behind::layer:0::interact:calendar", "freeform:deco_guild_086": "adventure_guild/guild_npc_guildmaster|none::2120,228::solid::behind::layer:1", "freeform:deco_guild_087": "adventure_guild/guild_treasury_vault|none::2222,465::solid::behind::layer:0"}	[{"id": "pz_guild_hall", "name": "Grand Guild Hall", "bounds": {"maxCol": 26, "maxRow": 29, "minCol": 2, "minRow": 16}, "createdAt": 1795157013762}, {"id": "pz_guild_tavern", "name": "Adventurers' Tavern & Hearth", "bounds": {"maxCol": 36, "maxRow": 29, "minCol": 28, "minRow": 16}, "createdAt": 1795157013763}, {"id": "pz_guild_armory", "name": "Armory & Enchanting Forge", "bounds": {"maxCol": 17, "maxRow": 14, "minCol": 2, "minRow": 2}, "createdAt": 1795157013764}, {"id": "pz_guild_arena", "name": "Sparring Arena & Range", "bounds": {"maxCol": 30, "maxRow": 14, "minCol": 19, "minRow": 2}, "createdAt": 1795157013765}, {"id": "pz_guild_infirmary", "name": "Infirmary & Alchemy Wing", "bounds": {"maxCol": 45, "maxRow": 29, "minCol": 38, "minRow": 13}, "createdAt": 1795157013766}, {"id": "pz_guild_sanctum", "name": "Guildmaster's Sanctum", "bounds": {"maxCol": 45, "maxRow": 11, "minCol": 32, "minRow": 2}, "createdAt": 1795157013767}]	[{"x": 1598, "y": 1418, "id": "jukebox_guild_tavern", "layer": 0, "ontop": false, "spaceId": "space_adventure_guild", "passable": false, "pausedAt": 0, "playlist": [], "isPlaying": false, "interaction": "jukebox", "interactable": true, "trackStartedAt": 0, "currentTrackIndex": 0}]	[]	[]	[]	[]	[]	[]	auto	{"x": 1075, "y": 1625, "id": "seller_space_adventure_guild", "layer": 0, "enabled": true, "spaceId": "space_adventure_guild", "shopTheme": "auto", "showCounter": true}
user_space_15	firdaus531's Space	Personal	15	t	f	[]	2026-11-12 16:36:29.243432+00	2026-11-21 07:49:06.221189+00	{"10,9": "grass_4", "5,14": "living_room_floor/sprite-4-7-3", "5,15": "living_room_floor/sprite-4-7-3", "5,16": "living_room_floor/6 2-floor-tan-2x2", "5,17": "living_room_floor/6 2-floor-tan-2x2", "5,18": "living_room_floor/sprite-4-1-18-2x2", "5,19": "living_room_floor/sprite-4-1-18-2x2", "5,20": "living_room_floor/sprite-4-1-16-2x2", "5,21": "living_room_floor/sprite-4-1-16-2x2", "5,22": "living_room_floor/sprite-4-1-13-2x2", "5,23": "living_room_floor/sprite-4-1-13-2x2", "6,14": "living_room_floor/sprite-4-7-3", "6,15": "living_room_floor/sprite-4-7-3", "6,16": "living_room_floor/6 2-floor-tan-2x2", "6,17": "living_room_floor/6 2-floor-tan-2x2", "6,18": "living_room_floor/sprite-4-1-18-2x2", "6,19": "living_room_floor/sprite-4-1-18-2x2", "6,20": "living_room_floor/sprite-4-1-16-2x2", "6,21": "living_room_floor/sprite-4-1-16-2x2", "6,22": "living_room_floor/sprite-4-1-13-2x2", "6,23": "living_room_floor/sprite-4-1-13-2x2", "7,12": "marble_4", "7,13": "marble_4", "7,14": "marble_3", "7,15": "marble_3", "7,16": "marble_2", "7,17": "marble_2", "7,18": "marble_1", "7,19": "marble_1", "7,20": "stone_8", "7,21": "stone_8", "7,22": "living_room_floor/6 2-floor-grey-2x2", "7,23": "living_room_floor/6 2-floor-grey-2x2", "8,12": "marble_4", "8,13": "marble_4", "8,14": "marble_3", "8,15": "marble_3", "8,16": "marble_2", "8,17": "marble_2", "8,18": "marble_1", "8,19": "marble_1", "8,20": "stone_8", "8,21": "stone_8", "8,22": "living_room_floor/6 2-floor-grey-2x2", "8,23": "living_room_floor/6 2-floor-grey-2x2", "9,10": "grass_1", "9,11": "grass_1", "9,12": "grass_2", "9,13": "grass_2", "9,14": "carpet_4", "9,15": "carpet_4", "9,16": "carpet_3", "9,17": "carpet_3", "9,18": "carpet_7", "9,19": "carpet_7", "9,20": "stone_2", "9,21": "stone_2", "9,22": "stone_5", "9,23": "stone_5", "10,10": "grass_1", "10,11": "grass_1", "10,12": "grass_2", "10,13": "grass_2", "10,14": "carpet_4", "10,15": "carpet_4", "10,16": "carpet_3", "10,17": "carpet_3", "10,18": "carpet_7", "10,19": "carpet_7", "10,20": "stone_2", "10,21": "stone_2", "10,22": "stone_5", "10,23": "stone_5", "11,10": "wood_1", "11,11": "wood_1", "11,12": "wood_2", "11,13": "wood_2", "11,14": "carpet_1", "11,15": "carpet_1", "11,16": "carpet_5", "11,17": "carpet_5", "11,18": "carpet_8", "11,19": "carpet_8", "11,20": "stone_3", "11,21": "stone_3", "11,22": "stone_6", "11,23": "stone_6", "12,10": "wood_1", "12,11": "wood_1", "12,12": "wood_2", "12,13": "wood_2", "12,14": "carpet_1", "12,15": "carpet_1", "12,16": "carpet_5", "12,17": "carpet_5", "12,18": "carpet_8", "12,19": "carpet_8", "12,20": "stone_3", "12,21": "stone_3", "12,22": "stone_6", "12,23": "stone_6", "13,10": "wood_5", "13,11": "wood_5", "13,12": "wood_4", "13,13": "wood_4", "13,14": "carpet_2", "13,15": "carpet_2", "13,16": "carpet_6", "13,17": "carpet_6", "13,18": "stone_1", "13,19": "stone_1", "13,20": "stone_4", "13,21": "stone_4", "13,22": "stone_7", "13,23": "stone_7", "14,10": "wood_5", "14,11": "wood_5", "14,12": "wood_4", "14,13": "wood_4", "14,14": "carpet_2", "14,15": "carpet_2", "14,16": "carpet_6", "14,17": "carpet_6", "14,18": "stone_1", "14,19": "stone_1", "14,20": "stone_4", "14,21": "stone_4", "14,22": "stone_7", "14,23": "stone_7", "15,10": "grass_4", "15,11": "grass_4", "15,12": "living_room_floor/sprite-4-7-4", "15,13": "living_room_floor/sprite-4-7-4", "15,14": "living_room_floor/sprite-4-7-2", "15,15": "living_room_floor/sprite-4-7-2", "15,16": "living_room_floor/sprite-4-7-1", "15,17": "living_room_floor/sprite-4-7-1", "15,18": "living_room_floor/sprite-4-1-20-2x2", "15,19": "living_room_floor/sprite-4-1-20-2x2", "15,20": "living_room_floor/sprite-4-1-22-2x2", "15,21": "living_room_floor/sprite-4-1-22-2x2", "15,22": "living_room_floor/sprite-4-1-24-2x2", "15,23": "living_room_floor/sprite-4-1-24-2x2", "16,10": "grass_4", "16,11": "grass_4", "16,12": "living_room_floor/sprite-4-7-4", "16,13": "living_room_floor/sprite-4-7-4", "16,14": "living_room_floor/sprite-4-7-2", "16,15": "living_room_floor/sprite-4-7-2", "16,16": "living_room_floor/sprite-4-7-1", "16,17": "living_room_floor/sprite-4-7-1", "16,18": "living_room_floor/sprite-4-1-20-2x2", "16,19": "living_room_floor/sprite-4-1-20-2x2", "16,20": "living_room_floor/sprite-4-1-22-2x2", "16,21": "living_room_floor/sprite-4-1-22-2x2", "16,22": "living_room_floor/sprite-4-1-24-2x2", "16,23": "living_room_floor/sprite-4-1-24-2x2", "17,10": "grass_4", "17,11": "grass_4", "17,12": "grass_4", "17,13": "grass_4", "20,17": "wood_4", "20,18": "wood_4", "20,19": "wood_4", "21,17": "wood_4", "21,18": "wood_4", "21,19": "wood_4", "22,17": "wood_4", "22,18": "wood_4", "22,19": "wood_4", "freeform:deco_1794889257066_uj9sl": "office_one/Copy (2) sprite-10-8|none::1078,811::passable::behind::layer:0::interact:notes", "freeform:deco_1794901512979_t9ne2": "office_one/Copy (1) sprite-6-5|none::1169,837::passable::behind::layer:0::interact:calendar", "freeform:deco_1794901589067_bftsm": "office_one/Copy (1) sprite-10-10|none::975,848::passable::behind::layer:0::interact:meals", "freeform:deco_1794915200235_2m8c0": "pet_shop/tile-B-01 15_sprite_79_48x48|none::1131,904::passable::behind::layer:0"}	[]	[]	[]	[]	[]	[]	["superadmin", "hanabilaa"]	[]	auto	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, display_name, password_hash, created_at, updated_at, role, parking_points, unlocked_skins, email, unlocked_assets, last_space_id, last_x, last_y, focus_points, focus_streak_days, last_focus_date, focus_freeze_shields, focus_shield_week, daily_focus_date, daily_focus_minutes, last_public_space_id) FROM stdin;
14	EmberF	\N	ab2fd8713b1e8acfd63e0262695533e4:eb3e4af56e09d7d5f981d4afbcbbad703c66f52bf70102cf3d712aff5a6fec0c0164c019f0ddbfaec195cd0f28bfaab6ef8cb65f7b2c00075e335ba9371de52a	2026-10-29 10:32:28.275782+00	2026-10-29 10:32:28.275782+00	user	0	[]	\N	[]	\N	\N	\N	0	0	\N	2	\N	\N	0	\N
12	leparkacc	Shadow Knight	ae27756c5e1e1dee27a7b3b0be49230d:d4424738b7f6221680a8e0f4c8d1c09a4b60967bf5a1c52d33d7cc22d2099c4fbd44ad6809ad632ad412cebd6a3a2ec2a103b2b9ed106cddadc826ce4c3ac645	2026-10-29 01:56:07.581012+00	2026-10-29 01:56:07.581012+00	user	0	[]	\N	[]	\N	\N	\N	0	0	\N	2	\N	\N	0	\N
11	CheeWei	ANG	1e877f041f5289aa98c2154a959b3d73:b2e07fff9624ce13ab14e39b48a02ce7f8f3b457e29dd797dd17987b1a2ab44ac7e1bc5fe616bd0c9047560728af662387e261bc1302a6d49385409141708fd9	2026-10-29 01:34:07.552013+00	2026-11-20 02:26:34.072709+00	user	139	["ghost_slime"]	cheeweinea@gmail.com	[]	space_central_plaza	183.63152470699183	621.6378925878827	139	0	\N	2	\N	\N	0	\N
17	nooogel	nooogel	0ffb4560ab5d7e72cfca260d27747a48:8aeb4a2620aa8d2799748a2a847874876935a5ecb8f3dacd8697049f0c8798ac7e309af7a3053268ac4198e7722c27a2adfb5407471c2e7b4a86162d07a99867	2026-11-19 09:42:55.299784+00	2026-11-19 09:44:41.540813+00	user	0	[]	yunhanchia@webbygroup.com	[]	space_central_plaza	618.8059402136487	1312.9508597863526	0	0	\N	2	\N	\N	0	\N
16	hanabilaa	melon	8f05edaab1dd554b82754bbd43a81b0e:0591002d71dc14831ecaa6f87b92edd97742b5537674170dced94aa8ff977bc6aabd5f84bd96daa045e70057883240f9bbd54779167707efebc4413cfd25a082	2026-11-17 15:24:05.295628+00	2026-11-22 10:24:51.70227+00	user	1	[]	nabila.nazrii13@gmail.com	[]	space_central_plaza	303.97759124265065	1254.3042752846272	1	0	\N	2	\N	\N	0	space_central_plaza
13	faiz	Admin	dcdcb5bf42276cb73aae016faea25a40:b671ad29d44122981e071d8f85b7ca885db6ee7b3e93a4153cbfae1d0a342541b6a9ae86ab214a42222a51b476d5d44c40171bc64016e5ffbfbe896d80d8c73c	2026-10-29 10:09:48.173095+00	2026-10-29 10:19:48.319927+00	user	1	[]	\N	[]	\N	\N	\N	1	0	\N	2	\N	\N	0	\N
8	superadmin	Admin	fe30eef88f77d3296278d853b70f0cb1:f0c16580d5161c05e87ec402b656f3feccdbb9f3478390ec17567480538172d3e564d6645e114fc62c01c610ebffa49da87a1c0034d97b503746953b874f0f61	2026-10-17 12:04:32.064755+00	2026-11-22 11:22:25.150532+00	superadmin	135	["ghost_slime"]	\N	[]	space_adventure_guild	1225	1715	235	0	\N	2	2026-11-16	2026-11-21	33	space_adventure_guild
15	firdaus531	Dauss	971ccad9a3d21a0256c9e16d3f350802:bc99fbc613fb3411bdf8f099c5954c89a0b5613f6f34e1624bb2bb453a777299dadbbc40f59e06f66b6e909a0ef92f784dd183da772edb069559ce33446ca59a	2026-11-12 16:36:29.23606+00	2026-11-22 11:56:27.400671+00	user	33	["ghost_slime"]	firdaus531@gmail.com	["office_one/Copy (2) sprite-10-8", "office_one/Copy (1) sprite-6-5", "office_one/Copy (1) sprite-10-10", "office_one/gov-tile-B-01_sprite_09_96x96"]	space_adventure_guild	1104.5089473335515	1598.1360488649216	327	1	2026-11-20	2	2026-11-16	2026-11-21	29	space_adventure_guild
\.


--
-- Name: calendar_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.calendar_events_id_seq', 6, true);


--
-- Name: friendships_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.friendships_id_seq', 3, true);


--
-- Name: notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notes_id_seq', 3, true);


--
-- Name: organisation_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.organisation_members_id_seq', 3, true);


--
-- Name: organisations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.organisations_id_seq', 1, true);


--
-- Name: space_inventories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.space_inventories_id_seq', 3, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 24, true);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: calendar_meals calendar_meals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_meals
    ADD CONSTRAINT calendar_meals_pkey PRIMARY KEY (space_id, day_of_week);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: friendships friendships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_pkey PRIMARY KEY (id);


--
-- Name: friendships friendships_requester_id_addressee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_requester_id_addressee_id_key UNIQUE (requester_id, addressee_id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: organisation_members organisation_members_organisation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisation_members
    ADD CONSTRAINT organisation_members_organisation_id_user_id_key UNIQUE (organisation_id, user_id);


--
-- Name: organisation_members organisation_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisation_members
    ADD CONSTRAINT organisation_members_pkey PRIMARY KEY (id);


--
-- Name: organisations organisations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisations
    ADD CONSTRAINT organisations_pkey PRIMARY KEY (id);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: rpg_profiles rpg_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpg_profiles
    ADD CONSTRAINT rpg_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: rpg_raid_state rpg_raid_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpg_raid_state
    ADD CONSTRAINT rpg_raid_state_pkey PRIMARY KEY (week_key);


--
-- Name: rpg_trade_offers rpg_trade_offers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpg_trade_offers
    ADD CONSTRAINT rpg_trade_offers_pkey PRIMARY KEY (offer_id);


--
-- Name: space_inventories space_inventories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_inventories
    ADD CONSTRAINT space_inventories_pkey PRIMARY KEY (id);


--
-- Name: spaces spaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spaces
    ADD CONSTRAINT spaces_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_cal_events_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cal_events_dates ON public.calendar_events USING btree (start_date, end_date);


--
-- Name: idx_cal_events_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cal_events_org ON public.calendar_events USING btree (organisation_id);


--
-- Name: idx_cal_events_space; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cal_events_space ON public.calendar_events USING btree (space_id);


--
-- Name: idx_cal_events_type_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cal_events_type_author ON public.calendar_events USING btree (type, author_id);


--
-- Name: idx_chat_messages_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_room ON public.chat_messages USING btree (room_type, room_id, "timestamp");


--
-- Name: idx_friendships_addressee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friendships_addressee ON public.friendships USING btree (addressee_id, status);


--
-- Name: idx_friendships_requester; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friendships_requester ON public.friendships USING btree (requester_id, status);


--
-- Name: idx_notes_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_org ON public.notes USING btree (organisation_id);


--
-- Name: idx_notes_space; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_space ON public.notes USING btree (space_id);


--
-- Name: idx_notes_type_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_type_author ON public.notes USING btree (type, author_id);


--
-- Name: idx_org_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_members_user ON public.organisation_members USING btree (user_id);


--
-- Name: idx_organisations_name_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_organisations_name_lower ON public.organisations USING btree (lower((name)::text));


--
-- Name: idx_players_last_seen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_last_seen ON public.players USING btree (last_seen DESC);


--
-- Name: idx_rpg_trade_squad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rpg_trade_squad ON public.rpg_trade_offers USING btree (squad_id, expires_at);


--
-- Name: idx_space_inventories_space; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_space_inventories_space ON public.space_inventories USING btree (space_id, bought, updated_at DESC);


--
-- Name: idx_spaces_superadmin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spaces_superadmin ON public.spaces USING btree (is_superadmin_space, category);


--
-- Name: idx_spaces_superadmin_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spaces_superadmin_name ON public.spaces USING btree (is_superadmin_space, name);


--
-- Name: idx_users_email_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_email_lower ON public.users USING btree (lower((email)::text)) WHERE (email IS NOT NULL);


--
-- Name: idx_users_username_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_username_lower ON public.users USING btree (lower((username)::text));


--
-- Name: calendar_events calendar_events_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: calendar_events calendar_events_organisation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id) ON DELETE CASCADE;


--
-- Name: calendar_events calendar_events_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: calendar_meals calendar_meals_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_meals
    ADD CONSTRAINT calendar_meals_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: friendships friendships_addressee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_addressee_id_fkey FOREIGN KEY (addressee_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friendships friendships_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notes notes_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notes notes_organisation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id) ON DELETE CASCADE;


--
-- Name: notes notes_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: organisation_members organisation_members_organisation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisation_members
    ADD CONSTRAINT organisation_members_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id) ON DELETE CASCADE;


--
-- Name: organisation_members organisation_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisation_members
    ADD CONSTRAINT organisation_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: organisations organisations_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisations
    ADD CONSTRAINT organisations_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rpg_profiles rpg_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpg_profiles
    ADD CONSTRAINT rpg_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rpg_trade_offers rpg_trade_offers_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpg_trade_offers
    ADD CONSTRAINT rpg_trade_offers_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: space_inventories space_inventories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_inventories
    ADD CONSTRAINT space_inventories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: space_inventories space_inventories_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.space_inventories
    ADD CONSTRAINT space_inventories_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;


--
-- Name: spaces spaces_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spaces
    ADD CONSTRAINT spaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict AxJ2hu9tpBvX0OYldJIbQtThgR7d6tvBPPIG5iKvMgzJYNVbfJrJCK82sQUjM0K

