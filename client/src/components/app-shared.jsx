import { LayoutGridIcon, ListChecksIcon, BarChart3Icon, MessageSquareTextIcon, UsersIcon, PlugIcon, SettingsIcon, HelpCircleIcon, ActivityIcon } from "lucide-react";

export const navGroups = [
	{
		items: [
			{
				title: "Overview",
				path: "#/overview",
				icon: (
					<LayoutGridIcon
					/>
				),
				isActive: true,
			},
		],
	},
	{
		label: "Today",
		items: [
			{
				title: "Queue",
				path: "#/queue",
				icon: (
					<ListChecksIcon
					/>
				),
			},
			{
				title: "Team insights",
				path: "#/team-insights",
				icon: (
					<BarChart3Icon
					/>
				),
			},
		],
	},
	{
		label: "Inbox",
		items: [
			{
				title: "Conversations",
				icon: (
					<MessageSquareTextIcon
					/>
				),
				subItems: [
					{ title: "Unassigned", path: "#/inbox/unassigned" },
					{ title: "Assigned to me", path: "#/inbox/assigned" },
					{ title: "Recently closed", path: "#/inbox/closed" },
				],
			},
			{
				title: "Customers",
				path: "#/customers",
				icon: (
					<UsersIcon
					/>
				),
			},
			{
				title: "Channels",
				path: "#/channels",
				icon: (
					<PlugIcon
					/>
				),
			},
		],
	},
	{
		label: "Organization",
		items: [
			{
				title: "Workspace",
				icon: (
					<SettingsIcon
					/>
				),
				subItems: [
					{ title: "Branding", path: "#/workspace/branding" },
					{ title: "Team & roles", path: "#/workspace/team" },
					{ title: "API keys", path: "#/workspace/api-keys" },
					{ title: "Webhooks", path: "#/workspace/webhooks" },
					{ title: "Billing", path: "#/workspace/billing" },
				],
			},
		],
	},
];

export const footerNavLinks = [
	{
		title: "Help Center",
		path: "#/help",
		icon: (
			<HelpCircleIcon
			/>
		),
	},
	{
		title: "System status",
		path: "#/status",
		icon: (
			<ActivityIcon
			/>
		),
	},
];

export const navLinks = [
	...navGroups.flatMap((group) =>
		group.items.flatMap((item) =>
			item.subItems?.length ? [item, ...item.subItems] : [item]
		)
	),
	...footerNavLinks,
];
