import { WidgetAdaptor } from "@forward-widget/libs/widget-adaptor";
import { rs } from "@rstest/core";

rs.stubGlobal("Widget", WidgetAdaptor);
WidgetAdaptor.storage.clear();
