@src/app/_components/renderers/stego-text-only-renderer.tsx:61-67 use external link icon instead
can you set @public/background.jpg as the site background and everything else except for the side bar should be transpernt unless I explicity set a background to it
can you use @public/repeat.png instead but it's small so don't stretch it instead just repeat it
@src/app/_components/renderers/stego-text-only-renderer.tsx add a shadcn accordion and it's content should be json viewer of 

										item.embedding.angleEmbedding.totalAnglesSelectedFirst

@src/app/_components/code-viewer.tsx not scrollable man
@src/app/_components/renderers/stego-text-only-renderer.tsx I want to show the results in sth like a table with pagination... but it's only one column because the search results are string[] @src/app/_components/renderers/stego-text-only-renderer.tsx:30-34 @src/app/_components/renderers/stego-text-only-renderer.tsx:187-189
move PaginatedTable to a dedicated table
and make the text wrap bacause results are long
add ui to change @src/app/_components/paginated-table.tsx pageSize

@src/app/_components/renderers/stego-text-only-renderer.tsx:171-177 use tanstack table and display this as table with three columns  with pagination
@src/app/_components/renderers/json-tree-renderer.tsx:119-121 can you console.log why there is no matching schema?!
write new renderer and schema for the @schema.json
