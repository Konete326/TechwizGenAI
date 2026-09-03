import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb";

export function AppBreadcrumbs({
    page
}) {
	if (!page?.title) {
		return null;
	}

	return (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbPage className="flex items-center gap-2 [&>svg]:size-3.5">
						{page.icon}
						{page.title}
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	);
}
